import { useMemo } from 'react';
import { motion } from 'framer-motion';

const rand = (a, b) => a + Math.random() * (b - a);

const FISH = [
  { top: 22, size: 44, dur: 46, delay: -6, color: '#f4a261' },
  { top: 38, size: 30, dur: 34, delay: -22, color: '#7fd8c8' },
  { top: 55, size: 52, dur: 58, delay: -40, color: '#e9c46a' },
  { top: 68, size: 26, dur: 30, delay: -12, color: '#9bb8ff' },
  { top: 30, size: 22, dur: 26, delay: -3, color: '#ff8fa3' },
];

export function Fish({ size, color }) {
  return (
    <svg viewBox="0 0 60 30" width={size} height={size / 2} className="fish-svg">
      <path d="M11 15 L0 4 L3 15 L0 26 Z" fill={color} opacity="0.8" />
      <path d="M8 15 Q20 2 38 7 Q51 11 56 15 Q51 19 38 23 Q20 28 8 15 Z" fill={color} />
      <path d="M26 7 Q30 15 26 23" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" fill="none" />
      <path d="M30 5 Q36 0 42 7" fill={color} opacity="0.7" />
      <circle cx="47" cy="13" r="2" fill="#03121f" />
    </svg>
  );
}

function Seaweed({ left, height, dur, delay, color }) {
  return (
    <svg className="weed" viewBox="0 0 40 200" preserveAspectRatio="none"
      style={{ left: `${left}%`, height, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
      <path d="M20 200 C 4 150, 36 115, 17 70 C 8 42, 28 24, 21 0" stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M18 130 Q 30 118 34 104 M19 88 Q 6 78 4 62" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function OceanBackground() {
  const particles = useMemo(() => Array.from({ length: 34 }, () => ({
    left: rand(0, 100), top: rand(0, 100), size: rand(1, 3.2), dur: rand(16, 32), delay: -rand(0, 30), op: rand(0.25, 0.7),
  })), []);
  const bubbles = useMemo(() => Array.from({ length: 16 }, () => ({
    left: rand(2, 98), size: rand(4, 13), dur: rand(8, 17), delay: -rand(0, 17), drift: rand(-40, 40),
  })), []);
  const weeds = useMemo(() => Array.from({ length: 11 }, (_, i) => ({
    left: (i * 9.3 + rand(-3, 3) + 100) % 100, height: rand(90, 210), dur: rand(4, 7), delay: -rand(0, 5),
    color: i % 3 === 0 ? '#0f7a63' : i % 3 === 1 ? '#0b5c52' : '#16806b',
  })), []);

  return (
    <motion.div className="ocean" initial={{ y: -70, scale: 1.08 }} animate={{ y: 0, scale: 1 }}
      transition={{ duration: 3.4, ease: [0.2, 0.7, 0.2, 1] }}>
      <div className="water" />
      <div className="caustics" />
      <motion.div className="rays" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1.8 }}>
        {[8, 24, 41, 58, 73, 88].map((l, i) => (
          <span key={l} className="ray" style={{ left: `${l}%`, animationDelay: `${-i * 2.3}s`, width: `${6 + (i % 3) * 4}vw` }} />
        ))}
      </motion.div>
      <motion.div className="particles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1.5 }}>
        {particles.map((p, i) => (
          <span key={i} className="particle" style={{
            left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, opacity: p.op,
            animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
          }} />
        ))}
      </motion.div>
      <motion.div className="fish-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 1.2 }}>
        {FISH.map((f, i) => (
          <div key={i} className="fish" style={{ top: `${f.top}%`, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}>
            <Fish size={f.size} color={f.color} />
          </div>
        ))}
      </motion.div>
      <div className="seabed">
        {weeds.map((w, i) => <Seaweed key={i} {...w} />)}
        <svg className="rocks" viewBox="0 0 1000 120" preserveAspectRatio="none">
          <path d="M0 120 L0 70 Q60 40 130 62 Q190 30 260 58 Q330 80 380 60 Q450 28 530 55 Q600 75 660 52 Q740 22 810 56 Q880 80 940 50 Q975 40 1000 55 L1000 120 Z" fill="#06202e" />
          <path d="M0 120 L0 92 Q90 72 170 90 Q260 104 340 86 Q430 68 520 88 Q610 104 700 84 Q800 66 880 90 Q950 100 1000 86 L1000 120 Z" fill="#031520" />
        </svg>
        <svg className="coral" style={{ left: '14%' }} viewBox="0 0 60 60">
          <path d="M30 60 L30 34 L18 20 M30 40 L44 24 L48 10 M18 20 L14 6 M18 20 L26 8 M44 24 L36 12" stroke="#d9667a" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
        <svg className="coral" style={{ left: '79%' }} viewBox="0 0 60 60">
          <path d="M30 60 L30 30 L20 16 M30 36 L42 20 M20 16 L16 4 M42 20 L48 6 M42 20 L34 8" stroke="#e8935a" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      <motion.div className="bubbles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 1 }}>
        {bubbles.map((b, i) => (
          <span key={i} className="bubble" style={{
            left: `${b.left}%`, width: b.size, height: b.size, '--drift': `${b.drift}px`,
            animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
          }} />
        ))}
      </motion.div>
      <div className="fog" />
    </motion.div>
  );
}
