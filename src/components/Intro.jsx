import { motion } from 'framer-motion';

const WORDS = ['OCEAN', 'SENSOR', 'NETWORK'];

export default function Intro({ onEnter }) {
  return (
    <motion.div className="intro" exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.6 }}>
      <motion.div className="intro-dark" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
      <div className="intro-content">
        {WORDS.map((w, i) => (
          <motion.div key={w} className="intro-word" initial={{ opacity: 0, y: 24, letterSpacing: '0.6em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.22em' }} transition={{ delay: 1.9 + i * 0.22, duration: 0.9, ease: 'easeOut' }}>
            {w}
          </motion.div>
        ))}
        <motion.div className="intro-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.7, duration: 0.8 }}>
          UNDERWATER NETWORK SIMULATOR
        </motion.div>
        <motion.button className="hud-btn intro-btn" onClick={onEnter}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.0, duration: 0.6 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          [ ENTER SIMULATION ]
        </motion.button>
      </div>
    </motion.div>
  );
}
