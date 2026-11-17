import { useState } from 'react';
import { Link } from 'react-router';
import { useGet } from '../../api/hooks';

const shortPrice = (n) => (n >= 1000 ? `${Math.round(n / 1000)}K` : n);

// Month view: free rooms and price for every day. Pick check-in, then check-out.
export default function AvailabilityCalendar({ roomType, branch }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [sel, setSel] = useState({ from: null, to: null });
  const { data } = useGet(['calendar', roomType, month], '/availability/calendar', { roomType, month });
  const [y, m] = month.split('-').map(Number);
  const shift = (d) => { const t = new Date(Date.UTC(y, m - 1 + d, 1)); setMonth(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`); };
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const pick = (d) => {
    if (d.past || !d.available) return;
    if (!sel.from || sel.to || d.date <= sel.from) setSel({ from: d.date, to: null });
    else setSel({ ...sel, to: d.date });
  };
  const inRange = (d) => sel.from && sel.to && d > sel.from && d < sel.to;

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="h-9 w-9 rounded-lg border border-line" aria-label="Previous month">‹</button>
        <p className="font-display text-2xl text-navy">{new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
        <button onClick={() => shift(1)} className="h-9 w-9 rounded-lg border border-line" aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }).map((_, i) => <span key={`e${i}`} />)}
        {(data?.days || []).map((d) => {
          const isSel = d.date === sel.from || d.date === sel.to;
          const off = d.past || !d.available;
          return (
            <button key={d.date} onClick={() => pick(d)} disabled={off} aria-label={`${d.date}, ${off ? 'not available' : `${d.available} free, PKR ${d.price}`}`}
              className={`flex h-14 flex-col items-center justify-center rounded-lg text-xs transition ${isSel ? 'bg-navy text-white' : inRange(d.date) ? 'bg-gold/30' : off ? 'text-[#B9B2A3] line-through' : 'hover:bg-ivory'}`}>
              <span className="font-semibold">{Number(d.date.slice(8))}</span>
              {!off && <span className={isSel ? 'text-gold' : 'text-[#2F6B3F]'}>{shortPrice(d.price)}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted">{sel.from ? (sel.to ? `${sel.from} → ${sel.to}` : `Check-in ${sel.from}, now pick check-out`) : 'Prices in PKR per night. Pick your dates.'}</span>
        {sel.from && sel.to && (
          <Link to={`/search?${new URLSearchParams({ branch, checkIn: sel.from, checkOut: sel.to, adults: 2 })}`} className="rounded-lg bg-gold px-4 py-2 font-semibold text-navy">See price and book</Link>
        )}
      </div>
    </div>
  );
}
