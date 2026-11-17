import { lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import SafeBox from '../../components/common/SafeBox';
const HotelScene = lazy(() => import('../../components/three/HotelScene'));

export default function WelcomeBanner({ name, role, line }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      className="relative grid overflow-hidden rounded-3xl bg-gradient-to-br from-[#141B2D] via-[#1B2440] to-[#2A3350] text-[#E9DDBF] md:grid-cols-[1.4fr_1fr]">
      <motion.span aria-hidden="true" className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-gold/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 7, repeat: Infinity }} />
      <div className="relative p-8 md:p-10">
        <p className="text-xs tracking-[0.3em] text-gold">{new Date().toDateString().toUpperCase()}</p>
        <h1 className="mt-3 font-display text-5xl leading-none text-white">{greet}, {name.split(' ')[0]}</h1>
        <p className="mt-3 max-w-md text-[#C7CBD8]">{line}</p>
        <p className="mt-6 inline-block rounded-full border border-gold/40 px-4 py-1.5 text-xs capitalize text-gold">{role === 'admin' ? 'Owner' : role} · LuxuryStay HMS</p>
      </div>
      <div className="relative hidden h-64 md:block">
        <SafeBox fallback={null}><Suspense fallback={null}><HotelScene /></Suspense></SafeBox>
      </div>
    </motion.section>
  );
}
