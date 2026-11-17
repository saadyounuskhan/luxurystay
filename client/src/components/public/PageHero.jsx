import { motion } from 'motion/react';

// Animated header used on every inner page of the website
export default function PageHero({ eyebrow, title, text, image }) {
  return (
    <section className="relative overflow-hidden bg-navy text-[#E9DDBF]">
      {image && <motion.img src={image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 10 }} className="absolute inset-0 h-full w-full object-cover opacity-40" />}
      <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/40" />
      <motion.div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 8, repeat: Infinity }} />
      <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs tracking-[0.3em] text-gold">{eyebrow}</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-3 max-w-3xl font-display text-5xl leading-none text-white md:text-6xl">{title}</motion.h1>
        {text && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-5 max-w-2xl text-lg text-[#C7CBD8]">{text}</motion.p>}
      </div>
    </section>
  );
}

export const reveal = { initial: { opacity: 0, y: 36 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.65 } };
