import { useState } from 'react';
import { useGet } from '../../api/hooks';
import { Spinner, Empty } from '../../components/common/ui';
import PageHero from '../../components/public/PageHero';
import RoomCard from './RoomCard';
import BookingBar from './BookingBar';

export default function RoomsPage() {
  const { data: types = [], isLoading } = useGet(['roomTypes'], '/room-types');
  const [city, setCity] = useState('All');
  const [sort, setSort] = useState('price');
  const cities = ['All', ...new Set(types.map((t) => t.branch?.city).filter(Boolean))];
  const list = types.filter((t) => city === 'All' || t.branch?.city === city)
    .sort((a, b) => (sort === 'price' ? a.basePrice - b.basePrice : sort === 'size' ? b.sizeSqm - a.sizeSqm : b.capacity.adults - a.capacity.adults));

  return (
    <>
      <PageHero eyebrow="ROOMS AND SUITES" title="A room for every kind of stay" text="Every room comes with a 3D tour you can open in your own space with AR." image="/images/rooms/deluxe-1.jpg" />
      <div className="relative z-10 mx-auto -mt-10 max-w-6xl px-6"><BookingBar /></div>
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by city">
            {cities.map((c) => (
              <button key={c} onClick={() => setCity(c)} aria-pressed={city === c}
                className={`h-10 rounded-full px-5 text-sm ${city === c ? 'bg-navy text-white' : 'border border-line bg-white text-navy hover:border-gold'}`}>{c}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-lg border border-line bg-white px-3 text-ink">
              <option value="price">Price: low to high</option><option value="size">Size: largest first</option><option value="guests">Most guests</option>
            </select>
          </label>
        </div>
        {isLoading ? <Spinner /> : list.length === 0 ? <Empty /> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map((t, i) => <RoomCard key={t._id} type={t} i={i % 4} />)}</div>
        )}
      </section>
    </>
  );
}
