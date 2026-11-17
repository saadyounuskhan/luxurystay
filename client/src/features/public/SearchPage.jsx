import { Link, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { useGet } from '../../api/hooks';
import { errorMessage } from '../../api/axios';
import { pkr, fmtDate } from '../../utils/format';
import BookingBar from './BookingBar';
import RoomVisual from './RoomVisual';
import { coverOf } from '../../utils/media';
import { Spinner, Empty } from '../../components/common/ui';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = Object.fromEntries(params);
  const { data = [], isLoading, error } = useGet(['availability'], '/availability', q, { enabled: !!q.branch });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <BookingBar initial={q} />
      <h1 className="mt-10 font-display text-4xl text-navy">Available rooms</h1>
      <p className="text-sm text-muted">{fmtDate(q.checkIn)} to {fmtDate(q.checkOut)} · {q.adults} adult(s)</p>
      {isLoading && <Spinner />}
      {error && <p role="alert" className="mt-6 text-[#8A2414]">{errorMessage(error)}</p>}
      {!isLoading && !error && data.length === 0 && <Empty text="No rooms match. Try other dates." />}
      <div className="mt-6 flex flex-col gap-5">
        {data.map((r, i) => (
          <motion.article key={r.roomType._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="grid overflow-hidden rounded-2xl border border-line bg-white md:grid-cols-[280px_1fr]">
            {coverOf(r.roomType) ? <img src={coverOf(r.roomType)} alt={r.roomType.name} className="h-full min-h-44 w-full object-cover" /> : <RoomVisual slug={r.roomType.slug} />}
            <div className="flex flex-wrap items-center justify-between gap-6 p-6">
              <div>
                <Link to={`/rooms/${r.roomType._id}`} className="font-display text-3xl font-semibold text-navy hover:text-gold-dark">{r.roomType.name}</Link>
                <p className="mt-1 text-sm text-muted">{r.roomType.sizeSqm} m² · {r.roomType.bedType} bed · up to {r.roomType.capacity.adults} adults</p>
                <p className="mt-2 text-sm text-[#4A4538]">{r.roomType.amenities.join(' · ')}</p>
                <p className={`mt-3 text-sm font-medium ${r.available ? 'text-[#2F6B3F]' : 'text-[#8A2414]'}`}>
                  {r.available ? `${r.available} room(s) left` : 'Sold out for these dates'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-semibold text-navy">{pkr(r.total)}</p>
                <p className="text-xs text-muted">{r.nights} night(s) · avg {pkr(r.ratePerNight)}/night · + {r.taxRate}% tax</p>
                {r.available > 0 && (
                  <Link to={`/book?${new URLSearchParams({ roomType: r.roomType._id, checkIn: q.checkIn, checkOut: q.checkOut, adults: q.adults })}`}
                    className="mt-3 inline-block rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-navy">Book now</Link>
                )}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
