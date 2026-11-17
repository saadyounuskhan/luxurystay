import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

// Short gold logo reveal the first time the site opens in this tab
export default function IntroSplash() {
  const seen = (() => { try { return sessionStorage.getItem('ls_intro') === '1'; } catch { return true; } })();
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [show, setShow] = useState(!seen && !reduce);
  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem('ls_intro', '1'); } catch { /* ignore */ }
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div exit={{ opacity: 0, transition: { duration: 0.6 } }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#141B2D]" onClick={() => setShow(false)}>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, ease: 'easeInOut' }} className="mb-6 h-px w-48 bg-[#C9A24D]" />
          <motion.p initial={{ opacity: 0, y: 20, letterSpacing: '0.5em' }} animate={{ opacity: 1, y: 0, letterSpacing: '0.02em' }} transition={{ duration: 1.1, delay: 0.2 }}
            className="font-display text-6xl text-white md:text-7xl">LuxuryStay</motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-3 text-xs tracking-[0.5em] text-[#C9A24D]">HOSPITALITY</motion.p>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: 0.3, ease: 'easeInOut' }} className="mt-6 h-px w-48 bg-[#C9A24D]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
