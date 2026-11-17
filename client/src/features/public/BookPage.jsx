import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams, useLocation } from 'react-router';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { pkr, fmtDate } from '../../utils/format';
import { Card, Button, Field, inputCls, Msg, Spinner } from '../../components/common/ui';

export default function BookPage() {
  const [params] = useSearchParams();
  const q = Object.fromEntries(params);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState('');
  const [error, setError] = useState('');
  const [promo, setPromo] = useState('');
  const [applied, setApplied] = useState(null);
  const [promoMsg, setPromoMsg] = useState({});
  const { data: type } = useGet(['roomType', q.roomType], `/room-types/${q.roomType}`, undefined, { enabled: !!q.roomType });
  const { data: avail = [] } = useGet(['availability'], '/availability', { branch: type?.branch?._id, checkIn: q.checkIn, checkOut: q.checkOut, adults: q.adults }, { enabled: !!type });

  const book = useAction((body) => api.post('/reservations', body), {
    invalidate: [['myBookings'], ['current']],
    onSuccess: (res) => navigate(`/booking/${res.data._id}`),
    onError: setError,
  });

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== 'guest') return <p className="p-10 text-center">Staff should book from the staff dashboard (Reservations → New booking).</p>;
  if (!type) return <Spinner />;
  const price = avail.find((a) => a.roomType._id === q.roomType);
  const discount = applied && price ? Math.round((price.total * applied.percent) / 100) : 0;
  const tax = price ? Math.round(((price.total - discount) * price.taxRate) / 100) : 0;
  const applyPromo = async () => {
    if (!promo.trim()) return;
    try {
      const { data } = await api.get('/promos/validate', { params: { code: promo, nights: price?.nights || 1, total: price?.total || 0 } });
      setApplied(data.data); setPromoMsg({ text: data.message });
    } catch (e) { setApplied(null); setPromoMsg({ text: e?.response?.data?.message || 'Code not valid', error: true }); }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-6 py-10 md:grid-cols-[1fr_340px]">
      <Card title="Confirm your booking">
        <p className="text-sm text-muted">Booking as</p>
        <p className="font-medium">{user.name} · {user.email}</p>
        <div className="mt-5">
          <Field label="Special requests (optional)" id="req">
            <textarea id="req" rows={4} value={requests} onChange={(e) => setRequests(e.target.value)} className={`${inputCls} h-auto py-2`} placeholder="High floor, extra pillows, late arrival…" />
          </Field>
        </div>
        <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-2">
          <Field label="Promo code" id="promo"><input id="promo" className={`${inputCls} uppercase`} value={promo} onChange={(e) => { setPromo(e.target.value); setApplied(null); setPromoMsg({}); }} placeholder="WELCOME10" /></Field>
          <Button variant="outline" type="button" onClick={applyPromo}>Apply</Button>
        </div>
        <Msg text={promoMsg.text} error={promoMsg.error} />
        <p className="mt-4 text-xs text-muted">Free cancellation up to 48 hours before check-in. You can pay online from your dashboard or at the hotel.</p>
        <Msg text={error} error />
        <Button variant="gold" className="mt-5 w-full" disabled={book.isPending || !price?.available}
          onClick={() => book.mutate({ roomType: q.roomType, checkIn: q.checkIn, checkOut: q.checkOut, adults: Number(q.adults || 1), specialRequests: requests || undefined, promoCode: applied?.code })}>
          {book.isPending ? 'Booking…' : 'Confirm booking'}
        </Button>
      </Card>
      <Card title="Summary" className="self-start">
        <p className="font-display text-2xl text-navy">{type.name}</p>
        <p className="text-sm text-muted">{type.branch?.name}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted">Check-in</dt><dd>{fmtDate(q.checkIn)}</dd>
          <dt className="text-muted">Check-out</dt><dd>{fmtDate(q.checkOut)}</dd>
          <dt className="text-muted">Guests</dt><dd>{q.adults} adult(s)</dd>
          <dt className="text-muted">Room</dt><dd>{price ? pkr(price.total) : '…'}</dd>
          {discount > 0 && (<><dt className="text-[#2F6B3F]">Promo {applied.code}</dt><dd className="text-[#2F6B3F]">− {pkr(discount)}</dd></>)}
          <dt className="text-muted">Tax</dt><dd>{pkr(tax)}</dd>
          <dt className="font-semibold">Total</dt><dd className="font-semibold">{price ? pkr(price.total - discount + tax) : '…'}</dd>
        </dl>
      </Card>
    </div>
  );
}
