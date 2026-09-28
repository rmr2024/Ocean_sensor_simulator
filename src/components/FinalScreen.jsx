import { motion } from 'framer-motion';
import { Star, RotateCcw, Trophy } from 'lucide-react';
import { AnimatedNumber } from './Hud';

export default function FinalScreen({ sim }) {
  const { score, stats, avgEnergy, emergency, best, newBest, actions } = sim;
  const ratio = stats.sent ? stats.delivered / stats.sent : 0;
  const stars = 1 + (ratio >= 0.75) + (ratio >= 0.9) + (emergency?.status === 'done') + (avgEnergy >= 60);
  const rows = [
    ['PACKETS DELIVERED', stats.delivered],
    ['PACKETS LOST', stats.lost],
    ['NETWORK ENERGY', `${avgEnergy}%`],
    ['ROUTES COMPLETED', stats.routes],
    ['REROUTES', stats.reroutes],
    ['EMERGENCY', emergency?.status === 'done' ? 'DELIVERED' : 'MISSED'],
  ];
  return (
    <motion.div className="final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="final-card" initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
        <div className="final-head">MISSION COMPLETE</div>
        <div className="final-score"><AnimatedNumber value={score} /></div>
        <div className="final-label">FINAL SCORE</div>
        {newBest && <motion.div className="new-best" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }}><Trophy size={14} /> NEW BEST SCORE</motion.div>}
        <div className="final-rows">
          {rows.map(([k, v], i) => (
            <motion.div key={k} className="kv" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }}>
              <span>{k}</span><b>{v}</b>
            </motion.div>
          ))}
        </div>
        <div className="final-label">NETWORK RATING</div>
        <div className="stars">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span key={i} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 1 + i * 0.15, type: 'spring' }}>
              <Star size={30} className={i < stars ? 'on' : ''} />
            </motion.span>
          ))}
        </div>
        <div className="kv dim best-row"><span>BEST SCORE</span><b>{best.toLocaleString()}</b></div>
        <motion.button className="hud-btn" onClick={actions.playAgain} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <RotateCcw size={16} /> PLAY AGAIN
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
