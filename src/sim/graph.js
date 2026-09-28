// Network topology + Dijkstra routing
export const BASE_ID = 'BASE';
export const SENSOR_IDS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

// Flow-space coordinates (node centers). BASE floats near the surface.
export const NODE_POS = {
  BASE: { x: 500, y: 40 },
  S1: { x: 120, y: 470 },
  S2: { x: 340, y: 545 },
  S3: { x: 250, y: 290 },
  S4: { x: 520, y: 340 },
  S5: { x: 770, y: 500 },
  S6: { x: 830, y: 255 },
};

export const LINKS = [
  ['S1', 'S2'], ['S1', 'S3'], ['S2', 'S3'], ['S2', 'S4'], ['S3', 'S4'], ['S3', 'BASE'],
  ['S4', 'BASE'], ['S4', 'S5'], ['S4', 'S6'], ['S5', 'S6'], ['S6', 'BASE'], ['S2', 'S5'],
];

// Visual center of each unit (packets, bursts and link endpoints attach here)
export const anchor = (id) => ({ x: NODE_POS[id].x, y: NODE_POS[id].y + (id === BASE_ID ? -13 : -9) });

export const METERS_PER_PX = 0.2;
export const RANGE_M = 80;

export const linkId = (a, b) => [a, b].sort().join('-');

export const distance = (a, b) =>
  Math.hypot(NODE_POS[a].x - NODE_POS[b].x, NODE_POS[a].y - NODE_POS[b].y) * METERS_PER_PX;

export const isAlive = (s) => !!s && !s.failed && s.energy > 0;

// cost = distance + energy cost + delay
export function linkCost(from, to, sensors, env = {}) {
  const dist = distance(from, to);
  const energyCost = to === BASE_ID ? 0 : (100 - sensors[to].energy) * 0.4;
  const queue = to === BASE_ID ? 0 : (env.loads?.[to] || 0) * 6;
  const delay = 4 * (env.delayFactor || 1) + queue;
  return dist + energyCost + delay;
}

export function dijkstra(sensors, source, env) {
  if (!isAlive(sensors[source])) return null;
  const ids = [...SENSOR_IDS, BASE_ID];
  const dist = Object.fromEntries(ids.map((id) => [id, Infinity]));
  const prev = {};
  const done = new Set();
  dist[source] = 0;

  for (;;) {
    let u = null;
    for (const id of ids) {
      if (!done.has(id) && dist[id] < Infinity && (u === null || dist[id] < dist[u])) u = id;
    }
    if (u === null || u === BASE_ID) break;
    done.add(u);
    for (const [a, b] of LINKS) {
      const v = a === u ? b : b === u ? a : null;
      if (!v || done.has(v)) continue;
      if (v !== BASE_ID && !isAlive(sensors[v])) continue;
      const alt = dist[u] + linkCost(u, v, sensors, env);
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  if (dist[BASE_ID] === Infinity) return null;
  const path = [BASE_ID];
  while (path[0] !== source) path.unshift(prev[path[0]]);
  return { path, cost: dist[BASE_ID] };
}
