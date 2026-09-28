import { useEffect, useRef } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { Waves, Check, Rocket, Send, AlertTriangle, Siren, Radio, Zap, Activity, Anchor } from 'lucide-react';
import { SENSOR_IDS, RANGE_M, isAlive } from '../sim/graph';
import { SURVIVE_GOAL, EMERGENCY_SECONDS } from '../sim/useSimulation';

const STEPS = ['DEPLOY', 'CONNECT', 'ROUTE', 'TRANSMIT', 'SURVIVE'];
const STEP_OF = { deploy: 0, connect: 1, route: 2, transmit: 3, survive: 4, emergency: 4, complete: 5 };
const MISSIONS = {
  deploy: ['01', 'NETWORK INITIALIZATION', 'Deploy the underwater sensors.'],
  connect: ['02', 'ESTABLISH COMMUNICATION', 'Acoustic modems are handshaking.'],
  route: ['03', 'ROUTE PLANNING', 'Pick a data source and a destination.'],
  transmit: ['04', 'FIRST TRANSMISSION', 'Send a data packet to the surface.'],
  survive: ['05', 'KEEP THE NETWORK ALIVE', 'Deliver packets through failures, traffic and ocean events.'],
  emergency: ['!!', 'EMERGENCY ALERT', 'Transmit emergency data before time runs out.'],
};

export function AnimatedNumber({ value }) {
  const ref = useRef(null);
  const prev = useRef(value);
  useEffect(() => {
    const c = animate(prev.current, value, {
      duration: 0.8, ease: 'easeOut',
      onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString(); },
    });
    prev.current = value;
    return () => c.stop();
  }, [value]);
  return <span ref={ref}>{value.toLocaleString()}</span>;
}

const Btn = ({ children, className = '', ...rest }) => (
  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} className={`hud-btn ${className}`} {...rest}>
    {children}
  </motion.button>
);

function SourcePicker({ sim }) {
  return (
    <div className="chips">
      {SENSOR_IDS.map((id) => {
        const ok = isAlive(sim.sensors[id]);
        return (
          <button key={id} disabled={!ok} className={`chip ${sim.source === id ? 'on' : ''}`} onClick={() => sim.actions.selectSource(id)}>
            {id}
          </button>
        );
      })}
    </div>
  );
}

const RouteLine = ({ route }) => (
  <div className="route-line">
    {route ? route.path.map((n, i) => (
      <span key={n}>{i > 0 && <em>→</em>}<b>{n}</b></span>
    )) : <span className="c-failed">NO ROUTE</span>}
    {route && <small>COST {route.cost.toFixed(1)}</small>}
  </div>
);

function ActionPanel({ sim }) {
  const { stage, actions, deployed, source, route, stats, surviveBase, emergency, timeLeft, packets } = sim;
  const manualBusy = packets.some((p) => p.kind === 'manual');
  let body = null;

  if (stage === 'deploy') {
    body = (
      <>
        <div className="panel-title">NETWORK INITIALIZATION</div>
        <div className="kv"><span>SENSORS</span><b>6</b></div>
        <div className="kv"><span>RANGE</span><b>{RANGE_M}m</b></div>
        <div className="kv"><span>BATTERY</span><b>100%</b></div>
        <Btn onClick={actions.deploy} disabled={deployed}><Rocket size={16} /> {deployed ? 'DEPLOYING…' : 'DEPLOY'}</Btn>
      </>
    );
  } else if (stage === 'connect') {
    body = (
      <>
        <div className="panel-title blink">ESTABLISHING COMMUNICATION…</div>
        <div className="progress"><motion.i initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3.4 }} /></div>
        <div className="muted">Acoustic handshake · 12 links</div>
      </>
    );
  } else if (stage === 'route') {
    body = (
      <>
        <div className="panel-title">SELECT DATA SOURCE</div>
        <SourcePicker sim={sim} />
        <div className="muted">or click a sensor in the water</div>
        {source && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="panel-title sm">DESTINATION</div>
            <Btn onClick={actions.confirmDestination}><Radio size={16} /> BASE STATION</Btn>
          </motion.div>
        )}
      </>
    );
  } else if (stage === 'transmit') {
    body = (
      <>
        <div className="panel-title">DATA PACKET READY</div>
        <div className="muted">DIJKSTRA SHORTEST PATH</div>
        <RouteLine route={route} />
        <Btn onClick={actions.transmit} disabled={manualBusy || !route}><Send size={16} /> {manualBusy ? 'TRANSMITTING…' : 'TRANSMIT'}</Btn>
      </>
    );
  } else if (stage === 'survive') {
    const done = Math.min(SURVIVE_GOAL, stats.delivered - surviveBase);
    body = (
      <>
        <div className="panel-title">DELIVERED {done} / {SURVIVE_GOAL}</div>
        <div className="progress"><i style={{ width: `${(done / SURVIVE_GOAL) * 100}%` }} /></div>
        <div className="panel-title sm">SOURCE</div>
        <SourcePicker sim={sim} />
        <RouteLine route={route} />
        <Btn onClick={actions.transmit} disabled={manualBusy || !route}><Send size={16} /> {manualBusy ? 'TRANSMITTING…' : 'TRANSMIT'}</Btn>
      </>
    );
  } else if (stage === 'emergency' && emergency) {
    body = (
      <>
        <div className="panel-title c-failed"><Siren size={16} /> EMERGENCY ALERT</div>
        <div className="muted">{emergency.source} detected abnormal ocean conditions. Transmit emergency data to the BASE STATION.</div>
        <div className="countdown">
          <span>TIME</span><b>{timeLeft.toFixed(1)}s</b>
        </div>
        <div className="progress red"><i style={{ width: `${(timeLeft / EMERGENCY_SECONDS) * 100}%` }} /></div>
        <RouteLine route={route} />
        <Btn className="danger" onClick={actions.sendEmergency} disabled={emergency.status !== 'active' || !route}>
          <Siren size={16} /> {emergency.status === 'active' ? 'TRANSMIT EMERGENCY DATA' : emergency.status === 'sending' ? 'TRANSMITTING…' : 'COMPLETE'}
        </Btn>
      </>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={stage} className={`hud-panel action ${stage === 'emergency' ? 'alert' : ''}`}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}>
        {body}
      </motion.div>
    </AnimatePresence>
  );
}

function StatusPanel({ sim }) {
  const { sensors, avgEnergy, packets, traffic, actions, congested, event, stage, failing } = sim;
  const online = SENSOR_IDS.filter((id) => isAlive(sensors[id])).length;
  const live = stage === 'survive' || stage === 'emergency';
  return (
    <div className="hud-panel status">
      <div className="panel-title"><Activity size={14} /> NETWORK STATUS</div>
      <div className="node-grid">
        {SENSOR_IDS.map((id) => {
          const s = sensors[id];
          const st = s.failing || !isAlive(s) ? 'failed' : s.energy < 25 ? 'low' : 'online';
          return (
            <div key={id} className={`ng st-${st}`}>
              <span className="dot" /><b>{id}</b><small>{Math.round(s.energy)}%</small>
            </div>
          );
        })}
      </div>
      <div className="kv"><span>ONLINE</span><b>{online} / 6</b></div>
      <div className="kv"><span>IN FLIGHT</span><b>{packets.length}</b></div>
      <div className="kv"><span><Zap size={12} /> AVG ENERGY</span><b>{avgEnergy}%</b></div>
      {live && (
        <>
          <div className="traffic">
            <div className="kv"><span>TRAFFIC</span><b>{traffic < 35 ? 'LOW' : traffic < 70 ? 'MED' : 'HIGH'}</b></div>
            <input type="range" min="0" max="100" value={traffic} onChange={(e) => actions.setTraffic(Number(e.target.value))} />
            <div className="range-labels"><span>LOW</span><span>HIGH</span></div>
          </div>
          <AnimatePresence>
            {congested && (
              <motion.div key="congestion" className="warn-chip" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <AlertTriangle size={13} /> NETWORK CONGESTION
              </motion.div>
            )}
            {event && (
              <motion.div key={event.id} className="event-chip" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {event.title}<small>{event.text}</small>
              </motion.div>
            )}
          </AnimatePresence>
          <Btn className="danger ghost" onClick={actions.failNode} disabled={failing}>
            <AlertTriangle size={15} /> SIMULATE FAILURE
          </Btn>
        </>
      )}
    </div>
  );
}

export default function Hud({ sim }) {
  const { stage, score, pops, stats, avgEnergy, banner, best } = sim;
  const step = STEP_OF[stage] ?? 0;
  const mission = MISSIONS[stage];

  return (
    <div className="hud">
      <div className="hud-tl">
        <div className="brand"><Waves size={20} /> OCEAN NETWORK</div>
        {mission && (
          <AnimatePresence mode="wait">
            <motion.div key={stage} className={`mission ${stage === 'emergency' ? 'alert' : ''}`}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mission-n">MISSION {mission[0]}</div>
              <div className="mission-t">{mission[1]}</div>
              <div className="mission-d">{mission[2]}</div>
            </motion.div>
          </AnimatePresence>
        )}
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? 'done' : i === step ? 'cur' : ''}>
              <span className="step-n">{i < step ? <Check size={11} /> : `0${i + 1}`}</span>{s}
            </li>
          ))}
        </ol>
      </div>

      <div className="hud-panel score">
        <div className="score-top"><span>SCORE</span><span className="lvl">LVL 0{Math.min(step + 1, 5)}</span></div>
        <div className="score-v"><AnimatedNumber value={score} /></div>
        <div className="score-pops">
          <AnimatePresence>
            {pops.slice(-3).map((p) => (
              <motion.span key={p.id} className={`score-pop ${p.tone}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: -18 }} exit={{ opacity: 0, y: -34 }}>
                +{p.value}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <div className="kv"><span>PACKETS</span><b>{stats.delivered} / {stats.sent}</b></div>
        <div className="kv"><span>ENERGY</span><b>{avgEnergy}%</b></div>
        <div className="kv dim"><span>BEST</span><b>{best.toLocaleString()}</b></div>
      </div>

      <AnimatePresence>
        {banner && (
          <motion.div key={banner.id} className={`banner ${banner.tone}`}
            initial={{ opacity: 0, y: -16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: banner.tone === 'danger' ? [0, -9, 9, -6, 6, 0] : 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }} transition={{ duration: 0.35 }}>
            <div className="banner-title">{banner.title}</div>
            {banner.lines?.map((l) => <div key={l} className="banner-line">{l}</div>)}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hud-bl"><ActionPanel sim={sim} /></div>
      <div className="hud-br"><StatusPanel sim={sim} /></div>
      <div className="hud-foot"><Anchor size={11} /> DEPTH 120m · ACOUSTIC 12kHz</div>
    </div>
  );
}
