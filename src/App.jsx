import { AnimatePresence, motion } from 'framer-motion';
import OceanBackground, { Fish } from './components/OceanBackground';
import NetworkView from './components/NetworkView';
import Hud from './components/Hud';
import Intro from './components/Intro';
import FinalScreen from './components/FinalScreen';
import { useSimulation } from './sim/useSimulation';

export default function App() {
  const sim = useSimulation();
  const { stage } = sim;
  return (
    <div className={`app ${stage === 'emergency' ? 'is-emergency' : ''}`}>
      <OceanBackground />
      {stage !== 'intro' && <NetworkView sim={sim} />}
      <div className="fg-fish"><Fish size={70} color="#0c3b52" /></div>
      <div className="vignette" />
      {stage === 'emergency' && <div className="alarm" />}
      {sim.flicker > 0 && (
        <motion.div key={sim.flicker} className="flicker" initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.45, 0, 0.3, 0] }} transition={{ duration: 0.7 }} />
      )}
      {stage !== 'intro' && stage !== 'complete' && <Hud sim={sim} />}
      <AnimatePresence>{stage === 'intro' && <Intro onEnter={sim.actions.enter} />}</AnimatePresence>
      <AnimatePresence>{stage === 'complete' && <FinalScreen sim={sim} />}</AnimatePresence>
    </div>
  );
}
