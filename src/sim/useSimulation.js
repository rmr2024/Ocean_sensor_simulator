import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BASE_ID, SENSOR_IDS, anchor, dijkstra, isAlive } from './graph';

export const SURVIVE_GOAL = 12;
export const EMERGENCY_SECONDS = 15;
const HOP_MS = 650;
const REPAIR_MS = 20000;
const BEST_KEY = 'osn-best-score';

let uidN = 0;
const uid = () => ++uidN;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const freshSensors = () =>
  Object.fromEntries(SENSOR_IDS.map((id) => [id, { energy: 100, failed: false, failing: false, packets: 0 }]));
const freshStats = () => ({ sent: 0, delivered: 0, lost: 0, routes: 0, reroutes: 0 });

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

export function computeLoads(packets) {
  const loads = {};
  packets.forEach((p) => p.path.forEach((id) => { loads[id] = (loads[id] || 0) + 1; }));
  return loads;
}

const envOf = (s) => ({ delayFactor: s.event?.type === 'current' ? 2 : 1, loads: computeLoads(s.packets) });

export function useSimulation() {
  const [stage, setStage] = useState('intro');
  const [deployed, setDeployed] = useState(false);
  const [linksUp, setLinksUp] = useState(false);
  const [sensors, setSensors] = useState(freshSensors);
  const [packets, setPackets] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [pulses, setPulses] = useState({});
  const [tx, setTx] = useState({});
  const [score, setScore] = useState(0);
  const [pops, setPops] = useState([]);
  const [stats, setStats] = useState(freshStats);
  const [source, setSource] = useState(null);
  const [traffic, setTraffic] = useState(25);
  const [event, setEvent] = useState(null);
  const [banner, setBanner] = useState(null);
  const [selected, setSelected] = useState(null);
  const [emergency, setEmergency] = useState(null);
  const [flicker, setFlicker] = useState(0);
  const [failing, setFailing] = useState(false);
  const [surviveBase, setSurviveBase] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [best, setBest] = useState(readBest);
  const [newBest, setNewBest] = useState(false);

  const timers = useRef(new Set());
  const later = useCallback((fn, ms) => {
    const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms);
    timers.current.add(t);
  }, []);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current.clear(); };
  useEffect(() => () => clearTimers(), []);

  // Latest state for timer callbacks
  const live = useRef({});
  live.current = { stage, sensors, packets, traffic, event, source, emergency, stats, score, failing, best };

  const notify = (b, ms = 2200) => {
    const id = uid();
    setBanner({ ...b, id });
    later(() => setBanner((cur) => (cur?.id === id ? null : cur)), ms);
  };

  const addScore = (value, label, tone = 'cyan') => {
    setScore((v) => v + value);
    const id = uid();
    setPops((p) => [...p, { id, value, label, tone }]);
    later(() => setPops((p) => p.filter((x) => x.id !== id)), 1800);
  };

  const burst = (pos, tone, big = false) => {
    const id = uid();
    setBursts((b) => [...b, { id, x: pos.x, y: pos.y, tone, big }]);
    later(() => setBursts((b) => b.filter((x) => x.id !== id)), 1000);
  };

  const finishGame = () => {
    clearTimers();
    const final = live.current.score;
    if (final > live.current.best) {
      setBest(final);
      setNewBest(true);
      try { localStorage.setItem(BEST_KEY, String(final)); } catch { /* storage unavailable */ }
    }
    setPackets([]); setPops([]); setBursts([]); setTx({}); setBanner(null); setEvent(null);
    setStage('complete');
  };

  const arrive = (node, i, kind) => {
    setPulses((p) => ({ ...p, [node]: (p[node] || 0) + 1 }));
    if (node === BASE_ID) return;
    setTx((t) => ({ ...t, [node]: (t[node] || 0) + 1 }));
    later(() => setTx((t) => ({ ...t, [node]: Math.max(0, (t[node] || 0) - 1) })), 450);
    const drain = (i === 0 ? 2.2 : 1.6) * (kind === 'auto' ? 0.55 : 1) * (kind === 'emergency' ? 0.5 : 1);
    const before = live.current.sensors[node]?.energy ?? 0;
    setSensors((ss) => ({
      ...ss,
      [node]: { ...ss[node], energy: Math.max(0, ss[node].energy - drain), packets: ss[node].packets + 1 },
    }));
    if (before > 0 && before - drain <= 0) {
      notify({ tone: 'danger', title: '🔴 POWER DEPLETED', lines: [`${node} OFFLINE`] });
    }
  };

  const finish = (pk) => {
    setPackets((p) => p.filter((x) => x.id !== pk.id));
    const end = anchor(pk.path[pk.path.length - 1]);
    if (pk.lost) {
      setStats((st) => ({ ...st, lost: st.lost + 1 }));
      burst(end, 'red');
      if (pk.kind === 'manual') notify({ tone: 'danger', title: 'PACKET LOST', lines: ['Dropped by congestion / interference'] }, 1800);
      return;
    }
    burst(end, pk.kind === 'emergency' ? 'red' : 'cyan', pk.kind !== 'auto');
    setStats((st) => ({ ...st, delivered: st.delivered + 1, routes: st.routes + (pk.kind === 'auto' ? 0 : 1) }));
    if (pk.kind === 'auto') {
      addScore(10, null);
    } else if (pk.kind === 'manual') {
      addScore(50, 'PACKET DELIVERED');
      if (pk.path.length <= 3) later(() => addScore(15, 'EFFICIENT ROUTE', 'teal'), 350);
      if (live.current.stage === 'transmit') {
        later(() => {
          setSurviveBase(live.current.stats.delivered);
          setStage('survive');
          notify({ tone: 'info', title: 'MISSION 05 · SURVIVE', lines: [`Deliver ${SURVIVE_GOAL} packets`, 'Live traffic & ocean events enabled'] }, 3200);
        }, 1400);
      }
    } else {
      addScore(150, 'ALERT DELIVERED', 'red');
      setEmergency((e) => ({ ...e, status: 'done' }));
      notify({ tone: 'alert', title: '🚨 ALERT DELIVERED', lines: ['+150'] }, 2600);
      later(finishGame, 2800);
    }
  };

  const sendPacket = (src, kind) => {
    const s = live.current;
    const r = dijkstra(s.sensors, src, envOf(s));
    if (!r) {
      if (kind !== 'auto') notify({ tone: 'danger', title: 'NO ROUTE AVAILABLE', lines: [`${src} is isolated from BASE`] });
      return null;
    }
    const inflight = s.packets.length;
    let hopMs = HOP_MS * (1 + s.traffic / 180) * (s.event?.type === 'current' ? 1.6 : 1) * (inflight > 5 ? 1.25 : 1);
    let loss = Math.max(0, (s.traffic - 60) / 160) + (inflight > 5 ? 0.08 : 0) + (s.event?.type === 'interference' ? 0.22 : 0);
    if (kind === 'emergency') { hopMs = HOP_MS * 0.55; loss = 0; }
    if (s.stage === 'transmit') loss = 0; // first transmission always lands
    const lost = Math.random() < loss;
    const path = lost
      ? r.path.slice(0, 1 + Math.max(1, Math.floor(Math.random() * (r.path.length - 1))))
      : r.path;
    const pk = { id: uid(), path, hopMs, kind, lost };
    setPackets((p) => [...p, pk]);
    setStats((st) => ({ ...st, sent: st.sent + 1 }));
    path.forEach((node, i) => {
      if (!(lost && i === path.length - 1)) later(() => arrive(node, i, kind), i * hopMs);
    });
    later(() => finish(pk), (path.length - 1) * hopMs + 80);
    return r;
  };

  const failNode = () => {
    const s = live.current;
    if (s.failing) return;
    const src = s.stage === 'emergency' ? s.emergency?.source : s.source;
    const candidates = SENSOR_IDS.filter((id) => isAlive(s.sensors[id]) && id !== src);
    if (!candidates.length) return;
    const route = src ? dijkstra(s.sensors, src, {}) : null;
    const onRoute = candidates.filter((id) => route?.path.includes(id));
    const id = onRoute.length ? pick(onRoute) : pick(candidates);

    setFailing(true);
    setSelected(null);
    setSensors((ss) => ({ ...ss, [id]: { ...ss[id], failing: true } }));
    setFlicker((f) => f + 1);
    notify({ tone: 'danger', title: '⚠ NODE FAILURE', lines: [`${id} OFFLINE`, 'REROUTING...'] }, 2500);
    later(() => setSensors((ss) => ({ ...ss, [id]: { ...ss[id], failing: false, failed: true } })), 900);
    later(() => {
      const s2 = live.current;
      const src2 = s2.stage === 'emergency' ? s2.emergency?.source : s2.source;
      const r = src2 ? dijkstra(s2.sensors, src2, {}) : null;
      setFailing(false);
      if (!src2 || r) {
        setStats((st) => ({ ...st, reroutes: st.reroutes + 1 }));
        addScore(40, 'NETWORK RESTORED', 'teal');
        notify({ tone: 'ok', title: 'NETWORK RESTORED', lines: [r ? r.path.join(' → ') : 'Routing tables updated'] }, 2400);
      } else {
        notify({ tone: 'danger', title: 'NO ROUTE', lines: [`${src2} isolated — awaiting repair`] });
      }
    }, 2600);
    later(() => {
      setSensors((ss) => ({ ...ss, [id]: { ...ss[id], failed: false } }));
      notify({ tone: 'ok', title: `${id} REPAIRED`, lines: ['Sensor back online'] }, 1600);
    }, REPAIR_MS);
  };

  const fireEvent = () => {
    const s = live.current;
    if (s.event || s.failing || s.stage !== 'survive') return;
    const type = pick(['current', 'interference', 'failure']);
    if (type === 'failure') {
      notify({ tone: 'danger', title: '⚠ SENSOR FAILURE', lines: ['Hardware fault detected'] }, 1200);
      later(failNode, 1200);
      return;
    }
    const ev = type === 'current'
      ? { type, title: '🌊 STRONG CURRENT', text: 'Transmission delay increased.' }
      : { type, title: '📡 SIGNAL INTERFERENCE', text: 'Packet reliability reduced.' };
    const id = uid();
    setEvent({ ...ev, id });
    notify({ tone: 'warn', title: ev.title, lines: [ev.text] }, 2600);
    later(() => setEvent((e) => (e?.id === id ? null : e)), 12000);
  };

  const startEmergency = () => {
    const s = live.current;
    const env = envOf(s);
    const order = ['S5', ...SENSOR_IDS.filter((x) => x !== 'S5')];
    let src = order.find((id) => dijkstra(s.sensors, id, env));
    if (!src) {
      src = 'S5';
      setSensors((ss) => Object.fromEntries(Object.entries(ss).map(([k, v]) => [k, { ...v, failed: false, energy: Math.max(v.energy, 30) }])));
    }
    setEvent(null);
    setSelected(null);
    setEmergency({ source: src, deadline: Date.now() + EMERGENCY_SECONDS * 1000, status: 'active' });
    setNow(Date.now());
    setStage('emergency');
  };

  // Survive goal → emergency mission
  useEffect(() => {
    if (stage === 'survive' && stats.delivered - surviveBase >= SURVIVE_GOAL) startEmergency();
  }, [stage, stats.delivered, surviveBase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Background traffic
  useEffect(() => {
    if (stage !== 'survive' && stage !== 'emergency') return undefined;
    const iv = setInterval(() => {
      const s = live.current;
      if (Math.random() < 0.06 + (s.traffic / 100) * 0.32) {
        const alive = SENSOR_IDS.filter((id) => isAlive(s.sensors[id]) && !s.sensors[id].failing);
        if (alive.length) sendPacket(pick(alive), 'auto');
      }
    }, 450);
    return () => clearInterval(iv);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Random ocean events
  useEffect(() => {
    if (stage !== 'survive') return undefined;
    let t;
    const schedule = (ms) => { t = setTimeout(() => { fireEvent(); schedule(20000 + Math.random() * 10000); }, ms); };
    schedule(9000);
    return () => clearTimeout(t);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Emergency countdown
  useEffect(() => {
    if (stage !== 'emergency') return undefined;
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, [stage]);
  const timeLeft = emergency ? Math.max(0, (emergency.deadline - now) / 1000) : 0;
  useEffect(() => {
    if (stage === 'emergency' && emergency?.status === 'active' && timeLeft <= 0) {
      setEmergency((e) => ({ ...e, status: 'failed' }));
      notify({ tone: 'danger', title: 'ALERT MISSED', lines: ['Emergency data never reached BASE'] }, 2600);
      later(finishGame, 2800);
    }
  }, [stage, emergency, timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Congestion warning (edge-triggered)
  const congested = stage !== 'complete' && (traffic >= 70 || packets.length >= 7);
  const wasCongested = useRef(false);
  useEffect(() => {
    if (congested && !wasCongested.current) notify({ tone: 'warn', title: '⚠ NETWORK CONGESTION', lines: ['Queues growing · packet loss likely'] }, 2200);
    wasCongested.current = congested;
  }, [congested]); // eslint-disable-line react-hooks/exhaustive-deps

  const routeSource = stage === 'emergency' ? emergency?.source : source;
  const route = useMemo(() => {
    if (!routeSource || !['route', 'transmit', 'survive', 'emergency'].includes(stage)) return null;
    return dijkstra(sensors, routeSource, { delayFactor: event?.type === 'current' ? 2 : 1 });
  }, [sensors, routeSource, stage, event]);

  const avgEnergy = Math.round(SENSOR_IDS.reduce((a, id) => a + sensors[id].energy, 0) / SENSOR_IDS.length);
  const loads = useMemo(() => computeLoads(packets), [packets]);

  // ---- player actions ----
  const actions = {
    enter: () => setStage('deploy'),
    deploy: () => {
      if (deployed) return;
      setDeployed(true);
      later(() => {
        addScore(50, 'NETWORK INITIALIZED');
        notify({ tone: 'ok', title: 'NETWORK INITIALIZED', lines: ['6 sensors deployed'] }, 1600);
      }, 1700);
      later(() => { setStage('connect'); setLinksUp(true); }, 2600);
      later(() => notify({ tone: 'ok', title: 'NETWORK ONLINE', lines: ['Acoustic links established'] }, 1800), 4800);
      later(() => setStage('route'), 6200);
    },
    selectSource: (id) => {
      if (isAlive(sensors[id]) && ['route', 'transmit', 'survive'].includes(stage)) setSource(id);
    },
    confirmDestination: () => { if (source) setStage('transmit'); },
    transmit: () => {
      if (!source || packets.some((p) => p.kind === 'manual')) return;
      sendPacket(source, 'manual');
    },
    sendEmergency: () => {
      if (emergency?.status !== 'active') return;
      if (sendPacket(emergency.source, 'emergency')) setEmergency((e) => ({ ...e, status: 'sending' }));
    },
    failNode,
    setTraffic,
    clickNode: (id) => {
      if (!deployed) return;
      setSelected((cur) => (cur === id ? null : id));
      if (stage === 'route' && id !== BASE_ID && isAlive(sensors[id])) setSource(id);
    },
    clearSelection: () => setSelected(null),
    playAgain: () => {
      clearTimers();
      setDeployed(false); setLinksUp(false); setSensors(freshSensors()); setPackets([]); setBursts([]);
      setPulses({}); setTx({}); setScore(0); setPops([]); setStats(freshStats()); setSource(null);
      setTraffic(25); setEvent(null); setBanner(null); setSelected(null); setEmergency(null);
      setFailing(false); setSurviveBase(0); setNewBest(false);
      setStage('deploy');
    },
  };

  return {
    stage, deployed, linksUp, sensors, packets, bursts, pulses, tx, score, pops, stats, source, traffic,
    event, banner, selected, emergency, flicker, failing, surviveBase, timeLeft, best, newBest,
    congested, route, avgEnergy, loads, actions,
  };
}
