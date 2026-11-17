import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useGet } from '../../api/hooks';
import PageHero, { reveal } from '../../components/public/PageHero';
import SmartImg from '../../components/common/SmartImg';

const Section = ({ children, className = '' }) => <section className={`mx-auto max-w-6xl px-6 py-14 ${className}`}>{children}</section>;
const Feature = ({ title, text, meta, i, image }) => (
  <motion.article {...reveal} transition={{ duration: 0.6, delay: i * 0.08 }} whileHover={{ y: -6 }}
    className="overflow-hidden rounded-2xl border border-line bg-white">
    {image ? <div className="h-52 overflow-hidden"><SmartImg srcs={image} className="h-full w-full object-cover transition duration-700 hover:scale-105" /></div> : <div className="h-1.5 bg-gradient-to-r from-[#C9A24D] to-[#E2C27A]" />}
    <div className="p-6">
      {meta && <p className="text-xs tracking-[0.2em] text-gold-dark">{meta}</p>}
      <h3 className="mt-1 font-display text-3xl text-navy">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#4A4538]">{text}</p>
    </div>
  </motion.article>
);

// ========== Dining ==========
const RESTAURANTS = [
  ['The Saffron Room', 'Pakistani and Mughlai classics slow-cooked over charcoal: nihari, karahi and our 12-hour haleem.', 'DINNER · 7 PM TO MIDNIGHT'],
  ['Azure Rooftop', 'Grills and seafood with the whole city below you. Best seats at sunset.', 'ROOFTOP · 5 PM TO 1 AM'],
  ['Café Ivory', 'All-day café with fresh bakes, specialty coffee and the famous LuxuryStay chai.', 'ALL DAY · 6 AM TO 11 PM'],
];
export function DiningPage() {
  return (
    <>
      <PageHero eyebrow="DINING" title="Three kitchens, one promise: food you remember" text="From slow-cooked Mughlai dinners to rooftop grills, every meal is made fresh by our chefs." image="/images/real/restaurant.jpg" />
      <Section><div className="grid gap-6 md:grid-cols-3">{RESTAURANTS.map(([t, d, m], i) => <Feature key={t} title={t} text={d} meta={m} i={i} image={[`/images/real/restaurant-${i + 1}.jpg`, ['/images/rooms/presidential-2.jpg', '/images/rooms/executive-2.jpg', '/images/rooms/deluxe-3.jpg'][i]]} />)}</div></Section>
      <Section className="pt-0">
        <motion.div {...reveal} className="grid items-center gap-8 rounded-3xl bg-navy p-10 text-[#E9DDBF] md:grid-cols-2">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold">IN-ROOM DINING</p>
            <h2 className="mt-2 font-display text-4xl text-white">Order from your phone, 24 hours</h2>
            <p className="mt-3 text-[#C7CBD8]">Staying with us? Open your guest dashboard and tap Room service. Your order is added to your bill automatically.</p>
          </div>
          <div className="text-right"><Link to="/guest" className="inline-block rounded-lg bg-gold px-6 py-3 font-semibold text-navy">Open my stay</Link></div>
        </motion.div>
      </Section>
    </>
  );
}

// ========== Wellness ==========
const SPA = [['Signature massage', '90 minutes of warm oil massage to melt away a long journey.', '90 MIN'], ['Rooftop infinity pool', 'Heated pool open to all guests, with cabanas and fresh juices.', '6 AM TO 10 PM'], ['Fitness studio', 'Modern gym with a personal trainer on request.', 'OPEN 24 HOURS'], ['Steam and sauna', 'Eucalyptus steam room and Finnish sauna after your workout.', 'INCLUDED FOR SUITES']];
export function WellnessPage() {
  return (
    <>
      <PageHero eyebrow="SPA AND WELLNESS" title="Slow down. Breathe. You are here now." text="Treatments, pool and fitness designed around rest." image="/images/real/spa.jpg" />
      <Section><div className="grid gap-6 sm:grid-cols-2">{SPA.map(([t, d, m], i) => <Feature key={t} title={t} text={d} meta={m} i={i} image={[['/images/real/spa.jpg', '/images/real/pool.jpg', '/images/real/gym.jpg', '/images/real/spa-2.jpg'][i], ['/images/rooms/deluxe-2.jpg', '/images/rooms/executive-3.jpg', '/images/rooms/standard-2.jpg', '/images/rooms/presidential-3.jpg'][i]]} />)}</div></Section>
    </>
  );
}

// ========== Offers ==========
const OFFERS = [
  ['Stay 3, pay 2', 'Book three nights in any Deluxe room or above and the third night is on us.', 'Valid until 31 Dec', 'deluxe-1'],
  ['Honeymoon suite', 'Executive Suite with rose petals, cake, couples massage and late checkout.', 'From PKR 120,000', 'executive-1'],
  ['Business traveller', 'Free airport transfer, breakfast and a 4 PM late checkout on weekdays.', 'Mon to Thu', 'standard-1'],
];
export function OffersPage() {
  return (
    <>
      <PageHero eyebrow="OFFERS" title="Better when booked direct" text="Members earn points on every stay and get the best rate guaranteed." />
      <Section>
        <div className="grid gap-6 md:grid-cols-3">{OFFERS.map(([t, d, m, img], i) => <Feature key={t} title={t} text={d} meta={m.toUpperCase()} i={i} image={`/images/rooms/${img}.jpg`} />)}</div>
        <motion.div {...reveal} className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-8">
          <div><h2 className="font-display text-3xl text-navy">Gold rewards</h2><p className="text-sm text-muted">Silver → Gold at 2,000 points → Platinum at 10,000 points.</p></div>
          <Link to="/register" className="rounded-lg bg-gold px-6 py-3 font-semibold text-navy">Join free</Link>
        </motion.div>
      </Section>
    </>
  );
}

// ========== Gallery ==========
export function GalleryPage() {
  const imgs = ['deluxe-1', 'presidential-1', 'executive-1', 'standard-1', 'deluxe-2', 'presidential-2', 'executive-2', 'standard-2', 'deluxe-3', 'presidential-3', 'executive-3', 'standard-3'];
  const [open, setOpen] = useState(null);
  return (
    <>
      <PageHero eyebrow="GALLERY" title="Take a look inside" />
      <Section>
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {imgs.map((n, i) => (
            <motion.button key={n} {...reveal} transition={{ delay: (i % 3) * 0.08, duration: 0.6 }} onClick={() => setOpen(n)} className="mb-4 block w-full overflow-hidden rounded-2xl" aria-label={`Open photo ${n}`}>
              <img src={`/images/rooms/${n}.jpg`} alt={n.replace('-', ' room ')} className={`w-full object-cover transition duration-700 hover:scale-105 ${i % 3 === 1 ? 'h-80' : 'h-60'}`} />
            </motion.button>
          ))}
        </div>
      </Section>
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6" onClick={() => setOpen(null)} role="dialog" aria-label="Photo"><img src={`/images/rooms/${open}.jpg`} alt="" className="max-h-full max-w-full rounded-xl" /></div>}
    </>
  );
}

// ========== About ==========
const Counter = ({ value, label: l }) => (
  <motion.div {...reveal} className="text-center">
    <p className="font-display text-6xl font-semibold text-gold">{value ?? '—'}</p>
    <p className="mt-1 text-sm text-[#C7CBD8]">{l}</p>
  </motion.div>
);
export function AboutPage() {
  const { data: s } = useGet(['publicStats'], '/public/stats');
  const values = [['Warmth', 'Every guest is greeted by name, every time.'], ['Detail', 'Fresh flowers, pressed linen, quiet rooms.'], ['Trust', 'Clear prices, honest bills, your data protected.']];
  return (
    <>
      <PageHero image="/images/real/lobby.jpg" eyebrow="ABOUT US" title="Pakistani hospitality, at its finest" text="LuxuryStay began with one hotel in Karachi and a simple idea: treat every guest like family. Today we welcome guests in three cities." />
      <section className="bg-navy py-14"><div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
        <Counter value={s?.branches} label="Hotels" /><Counter value={s?.rooms} label="Rooms and suites" /><Counter value={s?.guests} label="Registered guests" /><Counter value={s?.rating ? `${s.rating}★` : null} label={`Average of ${s?.reviews ?? 0} reviews`} />
      </div></section>
      <Section><div className="grid gap-6 md:grid-cols-3">{values.map(([t, d], i) => <Feature key={t} title={t} text={d} i={i} />)}</div></Section>
    </>
  );
}

// ========== FAQ ==========
const FAQS = [
  ['What are check-in and check-out times?', 'Check-in is from 2 PM and check-out is until 12 noon. Late checkout can be requested from your guest dashboard.'],
  ['Can I cancel my booking?', 'Yes. Cancellation is free up to 48 hours before check-in. After that, a 20% fee applies.'],
  ['How do I pay?', 'Pay online by card when you book or from your dashboard, or pay at the front desk by cash or card.'],
  ['How does the digital key work?', 'After check-in, a QR code appears in your guest dashboard. Show it at your door or to staff.'],
  ['How do I see the room in 3D or AR?', 'Open any room and choose “3D tour and AR”. On a phone, tap “View in your room” to see it through your camera.'],
  ['Can I download my invoice?', 'Yes. Go to Invoices in your dashboard to view, print or download a PDF.'],
  ['How do I delete my data?', 'Go to My account → Privacy. You can download all your data or delete your account.'],
];
export function FaqPage() {
  const [open, setOpen] = useState(0);
  return (
    <>
      <PageHero eyebrow="HELP" title="Frequently asked questions" />
      <Section className="max-w-3xl">
        {FAQS.map(([q, a], i) => (
          <div key={q} className="border-b border-line">
            <button className="flex w-full items-center justify-between py-5 text-left font-medium text-navy" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              {q}<span className="text-xl text-gold">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pb-5 text-[#4A4538]">{a}</motion.p>}
          </div>
        ))}
      </Section>
    </>
  );
}

// ========== Privacy ==========
export function PrivacyPage() {
  const items = [
    ['What we collect', 'Your name, email, phone, booking details, payments and any requests you make during your stay.'],
    ['Why', 'To manage your bookings, bills and stays, and to improve our service. We never sell your data.'],
    ['How it is protected', 'Passwords are encrypted, connections use HTTPS, and only staff who need your data can see it.'],
    ['Your rights', 'You can download all your data or delete your account at any time from My account. Invoices are kept for tax law, without your contact details.'],
    ['Contact', 'privacy@luxurystay.pk'],
  ];
  return (
    <>
      <PageHero eyebrow="PRIVACY" title="Your data, your choice" />
      <Section className="max-w-3xl">{items.map(([t, d]) => <div key={t} className="mb-6"><h2 className="font-display text-2xl text-navy">{t}</h2><p className="mt-1 text-[#4A4538]">{d}</p></div>)}</Section>
    </>
  );
}
