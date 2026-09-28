import { memo, useEffect, useMemo } from 'react';
import { ReactFlow, Handle, Position, NodeToolbar, ViewportPortal, useReactFlow } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { RadioTower } from 'lucide-react';
import { BASE_ID, LINKS, NODE_POS, SENSOR_IDS, anchor, isAlive, linkId } from '../sim/graph';

const FIT = { padding: 0.16 };
// Explicit handle bounds so edges never wait on DOM measurement
const handlesAt = (x, y) => ["source", "target"].map((type) => ({ type, position: Position.Top, x, y, width: 2, height: 2 }));
const SENSOR_HANDLES = handlesAt(41, 28);
const BASE_HANDLES = handlesAt(64, 41);
const STATUS_LABEL = {
  online: '🟢 ONLINE', transmitting: '🔵 TRANSMITTING', low: '🟡 LOW ENERGY', failed: '🔴 OFFLINE', failing: '⚠ FAULT',
};

const Handles = () => (
  <>
    <Handle type="source" position={Position.Top} className="hnd" isConnectable={false} />
    <Handle type="target" position={Position.Top} className="hnd" isConnectable={false} />
  </>
);

function Pulse({ n, tone }) {
  if (!n) return null;
  return (
    <div className="pulse-wrap" key={n}>
      <motion.span className={`ring ${tone}`} initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.8 }} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <motion.span key={a} className={`spark ${tone}`} initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: Math.cos((a * Math.PI) / 180) * 34, y: Math.sin((a * Math.PI) / 180) * 34, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }} />
      ))}
    </div>
  );
}

const SensorNode = memo(({ id, data }) => {
  const { status, energy, deployed, index, pulse, selected, emergency, isSource, packets, delay } = data;
  return (
    <div className={`sensor st-${status} ${deployed ? '' : 'undeployed'} ${selected ? 'sel' : ''} ${emergency ? 'emerg' : ''} ${isSource ? 'src' : ''}`}>
      <Handles />
      <motion.div className="sensor-drop" initial={{ y: -520, opacity: 0 }}
        animate={deployed ? { y: 0, opacity: 1 } : { y: -520, opacity: 0 }}
        transition={deployed ? { delay: index * 0.2, type: 'spring', stiffness: 55, damping: 13 } : { duration: 0.3 }}>
        <div className="sensor-float" style={{ animationDelay: `${-index * 0.7}s` }}>
          <div className="antenna"><i /></div>
          <div className="sensor-body">
            <span className="sid">{id}</span>
            <span className="eye" />
            <span className="grill" />
          </div>
          <div className="ebar"><i style={{ width: `${energy}%` }} /></div>
          <div className="tether" />
        </div>
        {deployed && <motion.span key="drop" className="ring cyan" initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ delay: index * 0.2 + 0.9, duration: 0.9 }} />}
        <Pulse n={pulse} tone={emergency ? 'red' : 'cyan'} />
      </motion.div>
      <NodeToolbar isVisible={selected} position={NODE_POS[id].x > 600 ? Position.Left : Position.Right} offset={16}>
        <motion.div className="inspect" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
          <div className="inspect-title">SENSOR {id}</div>
          <div className="kv"><span>STATUS</span><b className={`c-${status}`}>{STATUS_LABEL[status]}</b></div>
          <div className="kv"><span>ENERGY</span><b>{Math.round(energy)}%</b></div>
          <div className="mini-bar"><i style={{ width: `${energy}%` }} /></div>
          <div className="kv"><span>PACKETS</span><b>{packets}</b></div>
          <div className="kv"><span>DELAY</span><b>{status === 'failed' ? '—' : `${delay}ms`}</b></div>
        </motion.div>
      </NodeToolbar>
    </div>
  );
});

const BaseNode = memo(({ data }) => (
  <div className={`base ${data.active ? 'is-active' : ''}`}>
    <Handles />
    <div className="base-float">
      <div className="base-radar" />
      <div className="base-core"><RadioTower size={30} strokeWidth={1.6} /></div>
      <div className="base-label">BASE STATION</div>
    </div>
    <Pulse n={data.pulse} tone="cyan" />
  </div>
));

const LinkEdge = memo(({ sourceX, sourceY, targetX, targetY, data }) => {
  if (!data.visible) return null;
  const d = `M${sourceX},${sourceY} L${targetX},${targetY}`;
  const len = Math.hypot(targetX - sourceX, targetY - sourceY);
  return (
    <g className={`link link-${data.state}`} style={{ "--len": len, "--d": `${data.delay}s` }}>
      <path d={d} className="link-glow" style={{ strokeDasharray: len }} />
      <path d={d} className="link-core" />
      {data.state !== 'idle' && <path d={d} className={`link-flow ${data.dir < 0 ? 'rev' : ''}`} />}
    </g>
  );
});

const nodeTypes = { sensor: SensorNode, base: BaseNode };
const edgeTypes = { link: LinkEdge };

function Packet({ p }) {
  const xs = p.path.map((id) => anchor(id).x);
  const ys = p.path.map((id) => anchor(id).y);
  const duration = ((p.path.length - 1) * p.hopMs) / 1000;
  return [0.14, 0.07, 0].map((delay, i) => (
    <motion.div key={i} className={`packet ${p.kind} ${i < 2 ? 'trail' : ''} ${p.lost ? 'doomed' : ''}`}
      style={{ '--s': i === 0 ? 0.45 : i === 1 ? 0.7 : 1 }}
      initial={{ x: xs[0], y: ys[0] }} animate={{ x: xs, y: ys }}
      transition={{ duration, delay, ease: 'linear' }} />
  ));
}

function FitOnResize() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const f = () => fitView({ ...FIT, duration: 250 });
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, [fitView]);
  return null;
}

// Which links (and which direction) are carrying packets
function usedLinks(paths) {
  const m = {};
  paths.forEach((path) => {
    for (let i = 0; i < path.length - 1; i++) m[linkId(path[i], path[i + 1])] = [path[i], path[i + 1]];
  });
  return m;
}

export default function NetworkView({ sim }) {
  const { sensors, deployed, linksUp, pulses, tx, selected, emergency, stage, source, route, packets, bursts, pops, loads, event, actions } = sim;
  const emergSrc = stage === 'emergency' && emergency?.status !== 'done' ? emergency?.source : null;

  const nodes = useMemo(() => [
    {
      id: BASE_ID, type: 'base', position: NODE_POS.BASE, width: 130, height: 110, draggable: false, handles: BASE_HANDLES,
      data: { pulse: pulses.BASE || 0, active: packets.length > 0 },
    },
    ...SENSOR_IDS.map((id, index) => {
      const s = sensors[id];
      const status = s.failing ? 'failing' : !isAlive(s) ? 'failed' : tx[id] ? 'transmitting' : s.energy < 25 ? 'low' : 'online';
      return {
        id, type: 'sensor', position: NODE_POS[id], width: 84, height: 76, draggable: false, handles: SENSOR_HANDLES,
        data: {
          status, energy: s.energy, deployed, index, pulse: pulses[id] || 0, selected: selected === id,
          emergency: emergSrc === id, isSource: source === id && stage !== 'emergency', packets: s.packets,
          delay: 12 + (loads[id] || 0) * 8 + (event?.type === 'current' ? 15 : 0),
        },
      };
    }),
  ], [sensors, deployed, pulses, tx, selected, emergSrc, source, stage, packets.length, loads, event]);

  const edges = useMemo(() => {
    const active = usedLinks(packets.filter((p) => p.kind !== 'emergency').map((p) => p.path));
    const emerg = usedLinks(packets.filter((p) => p.kind === 'emergency').map((p) => p.path));
    const planned = usedLinks(route ? [route.path] : []);
    return LINKS.map(([a, b], i) => {
      const id = linkId(a, b);
      const broken = [a, b].some((n) => n !== BASE_ID && !isAlive(sensors[n]));
      const hit = emerg[id] || active[id] || planned[id];
      const state = broken ? 'broken' : emerg[id] ? 'emergency' : active[id] ? 'active' : planned[id] ? 'route' : 'idle';
      return {
        id, source: a, target: b, type: 'link',
        data: { state, visible: linksUp, delay: i * 0.1, dir: hit && hit[0] === b ? -1 : 1 },
      };
    });
  }, [packets, route, sensors, linksUp]);

  return (
    <div className="network">
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        nodeOrigin={[0.5, 0.5]} fitView fitViewOptions={FIT}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
        panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} preventScrolling={false}
        onNodeClick={(_, n) => actions.clickNode(n.id)} onPaneClick={actions.clearSelection}
      >
        <FitOnResize />
        <ViewportPortal>
          <div className="fx-layer">
            {packets.map((p) => <Packet key={p.id} p={p} />)}
            <AnimatePresence>
              {bursts.map((b) => (
                <motion.div key={b.id} className={`burst ${b.tone}`} style={{ left: b.x, top: b.y }}
                  initial={{ scale: 0.2, opacity: 0.95 }} animate={{ scale: b.big ? 4.2 : 2.2, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
              ))}
            </AnimatePresence>
            <div className="pop-anchor" style={{ left: NODE_POS.BASE.x, top: NODE_POS.BASE.y - 64 }}>
              <AnimatePresence>
                {pops.filter((p) => p.label).slice(-2).map((p) => (
                  <motion.div key={p.id} className={`world-pop ${p.tone}`} initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: -24, scale: 1 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.5 }}>
                    <b>+{p.value}</b><span>{p.label}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </ViewportPortal>
      </ReactFlow>
    </div>
  );
}
