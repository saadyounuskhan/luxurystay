import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'motion/react';
import { useGet } from '../../api/hooks';
import { pkr } from '../../utils/format';
import { coverOf } from '../../utils/media';
import { Spinner } from '../../components/common/ui';
import Gallery from '../../components/public/Gallery';
import ModelViewer from '../../components/public/ModelViewer';
import Panorama360 from '../../components/public/Panorama360';
import AvailabilityCalendar from '../../components/public/AvailabilityCalendar';
import RoomReviews from '../../components/public/RoomReviews';
import { useUi } from '../../store/uiStore';
import BookingBar from './BookingBar';
import RoomCard from './RoomCard';

export default function RoomPage() {
  const { id } = useParams();
  const { data: t, isLoading } = useGet(['roomType', id], `/room-types/${id}`);
  const { data: all = [] } = useGet(['roomTypes'], '/room-types');
  const [tab, setTab] = useState('360');
  const { saved, toggleSaved } = useUi();
  if (isLoading || !t) return <Spinner />;
  const similar = all.filter((x) => x.branch?._id === t.branch?._id && x._id !== t._id).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted"><Link to="/rooms" className="hover:text-navy">Rooms</Link> / {t.branch?.city} / <span className="text-navy">{t.name}</span></nav>
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="mb-3 flex gap-2" role="tablist">
            {[['360', '360° view'], ['photos', 'Photos'], ['3d', '3D tour and AR']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`h-10 rounded-full px-5 text-sm ${tab === k ? 'bg-navy text-white' : 'border border-line bg-white text-navy'}`}>{l}</button>
            ))}
          </div>
          {tab === '360' ? (t.panoramaUrl ? <Panorama360 src={t.panoramaUrl} /> : <p className="rounded-2xl bg-ivory p-10 text-center text-muted">360° photo coming soon</p>)
            : tab === 'photos' ? <Gallery images={t.images} alt={t.name} /> : t.model3dUrl
            ? <ModelViewer src={t.model3dUrl} alt={`3D model of ${t.name}`} poster={coverOf(t)} />
            : <p className="rounded-2xl bg-ivory p-10 text-center text-muted">3D model coming soon</p>}
          {tab === '3d' && <p className="mt-3 text-sm text-muted">On a phone, tap “View in your room (AR)” to place this room in front of you using your camera.</p>}
        </div>
        <motion.aside initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="self-start rounded-2xl border border-line bg-white p-7 lg:sticky lg:top-24">
          <p className="text-xs tracking-[0.3em] text-gold-dark">{t.branch?.name?.toUpperCase()}</p>
          <h1 className="mt-1 font-display text-5xl leading-none text-navy">{t.name}</h1>
          <p className="mt-3 text-[#4A4538]">{t.description}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-ivory p-4 text-sm">
            <dt className="text-muted">From</dt><dd className="font-semibold">{pkr(t.basePrice)} / night</dd>
            <dt className="text-muted">Size</dt><dd>{t.sizeSqm} m²</dd>
            <dt className="text-muted">Bed</dt><dd>{t.bedType}</dd>
            <dt className="text-muted">Guests</dt><dd>{t.capacity.adults} adults, {t.capacity.children} children</dd>
            {t.view && (<><dt className="text-muted">View</dt><dd>{t.view}</dd></>)}
          </dl>
          <h2 className="mt-5 text-sm font-semibold">Amenities</h2>
          <ul className="mt-2 flex flex-wrap gap-2">{t.amenities.map((a) => <li key={a} className="rounded-full border border-line px-3 py-1 text-sm">{a}</li>)}</ul>
          <div className="mt-6 flex gap-2">
            <a href="#dates" className="flex-1 rounded-lg bg-gold py-3 text-center font-semibold text-navy">Check dates and book</a>
            <button onClick={() => toggleSaved(t._id)} aria-pressed={saved.includes(t._id)} className="h-12 rounded-lg border border-line px-4 text-lg text-[#B23A48]" aria-label="Save room">{saved.includes(t._id) ? '♥' : '♡'}</button>
          </div>
        </motion.aside>
      </div>
      <h2 id="dates" className="mt-14 font-display text-3xl text-navy">Availability and prices</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <AvailabilityCalendar roomType={t._id} branch={t.branch?._id} />
        <div>
          <p className="mb-3 text-sm text-muted">Or search all rooms for your dates:</p>
          <BookingBar compact initial={{ branch: t.branch?._id }} />
        </div>
      </div>
      <h2 className="mt-14 font-display text-3xl text-navy">Guest reviews</h2>
      <div className="mt-4"><RoomReviews roomType={t._id} /></div>
      {similar.length > 0 && (
        <>
          <h2 className="mt-14 font-display text-3xl text-navy">More rooms in {t.branch?.city}</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{similar.map((s, i) => <RoomCard key={s._id} type={s} i={i} />)}</div>
        </>
      )}
    </div>
  );
}
