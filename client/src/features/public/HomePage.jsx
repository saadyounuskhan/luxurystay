import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useGet } from '../../api/hooks';
import BookingBar from './BookingBar';
import RoomCard from './RoomCard';
import { useT } from '../../utils/i18n';
import SafeBox from '../../components/common/SafeBox';
import SmartImg from '../../components/common/SmartImg';

const HotelScene = lazy(() => import('../../components/three/HotelScene'));

const reveal = { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: 0.7 } };

const PERKS = [
  ['Digital key', 'Check in and open your room with a QR code on your phone.'],
  ['Fine dining', 'Order in-room dining straight from your guest dashboard.'],
  ['Spa and pool', 'Rooftop pool, steam room and treatments on request.'],
  ['Airport transfer', 'Request a car from the app and we meet you at arrivals.'],
];

export default function HomePage() {
  const t = useT();
  const { data: types = [] } = useGet(['roomTypes'], '/room-types');
  const { data: reviews = [] } = useGet(['publicReviews'], '/feedback/public');
  const { data: stats } = useGet(['publicStats'], '/public/stats');
  const unique = Object.values(types.reduce((acc, t) => ({ ...acc, [t.slug]: acc[t.slug] || t }), {}));

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#0A0F1C] text-[#E9DDBF]">
        {/* Full-screen photo that slowly zooms (your real hero.jpg is used if you add one) */}
        <motion.div aria-hidden="true" className="absolute inset-0 -z-10" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 14, ease: 'easeOut' }}>
          <SmartImg srcs={['/images/real/hero.jpg', '/images/real/hero.jpeg', '/images/rooms/deluxe-1.jpg']} className="h-full w-full object-cover" />
        </motion.div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0A0F1C] via-[#0A0F1C]/80 to-[#0A0F1C]/20" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#0A0F1C] to-transparent" />
        <div className="mx-auto grid min-h-[78vh] max-w-7xl items-center gap-10 px-6 pb-32 pt-14 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 text-xs tracking-[0.35em] text-[#E2C27A]">
              <span className="h-px w-10 bg-[#C9A24D]" />KARACHI · LAHORE · ISLAMABAD
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15 }}
              className="mt-6 font-display text-6xl font-medium leading-[0.92] text-white md:text-8xl">
              {t('Where every stay becomes a')} <em className="bg-gradient-to-r from-[#E2C27A] to-[#C9A24D] bg-clip-text text-transparent">{t('story')}</em>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-7 max-w-xl text-lg leading-relaxed text-[#D5D8E2]">
              {t('Quiet suites, attentive service and a city view from every window. Book direct for the best rate and Gold rewards.')}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-9 flex flex-wrap gap-3">
              <Link to="/rooms" className="group inline-flex items-center gap-2 rounded-full bg-[#C9A24D] px-7 py-3.5 font-semibold text-[#141B2D] transition hover:bg-[#E2C27A]">{t('Explore rooms')}<span className="transition group-hover:translate-x-1">→</span></Link>
              <Link to="/register" className="rounded-full border border-white/30 px-7 py-3.5 text-white backdrop-blur-sm transition hover:bg-white/10">{t('Join rewards')}</Link>
            </motion.div>
            <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-12 flex flex-wrap gap-10 border-t border-white/15 pt-6">
              {[[stats?.branches ?? '—', 'Hotels'], [stats?.rooms ?? '—', 'Rooms and suites'], [stats?.rating ? `${stats.rating}★` : '—', 'Guest rating']].map(([v, l]) => (
                <div key={l}><dt className="sr-only">{l}</dt><dd className="font-display text-4xl text-white">{v}</dd><p className="text-xs tracking-wider text-[#A9AFC2]">{l}</p></div>
              ))}
            </motion.dl>
          </div>
          <motion.div initial={{ opacity: 0, y: 30, rotateY: -12 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ duration: 1.1, delay: 0.3 }} style={{ transformPerspective: 1200 }}
            className="relative hidden h-[480px] overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.06] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-md lg:block">
            <SafeBox fallback={<div className="flex h-full items-center justify-center font-display text-3xl text-[#C9A24D]">LuxuryStay</div>}>
              <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-[#C9A24D]">Loading 3D hotel…</div>}>
                <HotelScene />
              </Suspense>
            </SafeBox>
            <p className="pointer-events-none absolute bottom-5 left-0 right-0 text-center text-[10px] tracking-[0.35em] text-[#E2C27A]">OUR TOWER IN 3D · DRAG TO ROTATE</p>
          </motion.div>
        </div>
        <motion.div aria-hidden="true" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-24 left-1/2 hidden h-10 w-6 -translate-x-1/2 rounded-full border border-white/40 md:block">
          <span className="mx-auto mt-2 block h-2 w-1 rounded-full bg-white/70" />
        </motion.div>
      </section>

      <div className="relative z-10 mx-auto -mt-16 max-w-6xl px-6"><BookingBar /></div>

      <section id="rooms" className="mx-auto max-w-6xl px-6 py-20">
        <motion.div {...reveal} className="mb-8">
          <p className="text-xs tracking-[0.3em] text-gold-dark">ROOMS AND SUITES</p>
          <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="font-display text-5xl text-navy">{t('Choose your space')}</h2><Link to="/rooms" className="text-sm font-medium text-gold-dark">{t('See all rooms →')}</Link></div>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {unique.map((t, i) => <RoomCard key={t._id} type={t} i={i} />)}
        </div>
      </section>

      <section id="experiences" className="mx-auto max-w-6xl px-6 py-12">
        <motion.h2 {...reveal} className="text-center font-display text-5xl text-navy">{t('Small details, done well')}</motion.h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(([t, d], i) => (
            <motion.div key={t} {...reveal} transition={{ delay: i * 0.1, duration: 0.6 }} className="border-t-2 border-gold pt-5">
              <h3 className="font-display text-2xl font-semibold text-navy">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4A4538]">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <motion.h2 {...reveal} className="font-display text-4xl text-navy">{t('What our guests say')}</motion.h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <motion.blockquote key={r._id} {...reveal} className="rounded-2xl border border-line bg-white p-6">
                <p className="text-gold" aria-label={`${r.rating} stars`}>{'★'.repeat(r.rating)}</p>
                <p className="mt-2 font-display text-xl text-navy">“{r.comment}”</p>
                <footer className="mt-3 text-sm text-muted">— {r.guest?.name}</footer>
              </motion.blockquote>
            ))}
          </div>
        </section>
      )}

      <section id="offers" className="mx-auto max-w-6xl px-6 pb-20 pt-6">
        <motion.div {...reveal} className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-navy p-10">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold">MEMBER OFFER</p>
            <h2 className="mt-2 font-display text-4xl text-white">Earn points on every stay</h2>
            <p className="mt-2 text-[#C7CBD8]">Silver, Gold and Platinum tiers with free upgrades.</p>
          </div>
          <Link to="/register" className="rounded-lg bg-gold px-6 py-3 font-semibold text-navy">Join rewards</Link>
        </motion.div>
      </section>
    </>
  );
}
