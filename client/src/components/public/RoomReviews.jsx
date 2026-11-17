import { useGet } from '../../api/hooks';
import { fmtDate } from '../../utils/format';

export default function RoomReviews({ roomType }) {
  const { data } = useGet(['roomReviews', roomType], `/room-types/${roomType}/reviews`);
  if (!data?.count) return <p className="text-sm text-muted">No reviews yet for this room.</p>;
  return (
    <div>
      <p className="flex items-baseline gap-2"><span className="font-display text-5xl font-semibold text-navy">{data.average}</span><span className="text-gold">{'★'.repeat(Math.round(data.average))}</span><span className="text-sm text-muted">{data.count} reviews</span></p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data.items.slice(0, 6).map((r) => (
          <blockquote key={r._id} className="rounded-xl border border-line bg-white p-4">
            <p className="text-gold" aria-label={`${r.rating} stars`}>{'★'.repeat(r.rating)}</p>
            <p className="mt-1">{r.comment}</p>
            <footer className="mt-2 text-xs text-muted">{r.guest?.name} · {fmtDate(r.createdAt)}</footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
