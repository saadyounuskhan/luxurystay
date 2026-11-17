import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import { useGet } from '../../api/hooks';
import { pkr, fmtDate } from '../../utils/format';
import { useState } from 'react';
import { Spinner, Button, Msg } from '../../components/common/ui';
import { usePayNow } from '../../api/payments';

export default function ConfirmationPage() {
  const { id } = useParams();
  const { data, isLoading } = useGet(['reservation', id], `/reservations/${id}`);
  const [msg, setMsg] = useState({});
  const payNow = usePayNow({ onDone: (t) => setMsg({ text: t }), onError: (e) => setMsg({ text: e, error: true }) });
  if (isLoading || !data) return <Spinner />;
  const { reservation: r, folio } = data;

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold text-4xl text-navy" aria-hidden="true">✓</motion.div>
      <h1 className="mt-6 font-display text-5xl text-navy">Booking confirmed</h1>
      <p className="mt-2 text-muted">Your booking code is</p>
      <p className="font-display text-3xl font-semibold text-gold-dark">{r.code}</p>
      <div className="mt-8 rounded-2xl border border-line bg-white p-6 text-left text-sm">
        <p className="font-display text-2xl text-navy">{r.roomType.name} · Room {r.room?.number}</p>
        <p className="text-muted">{r.branch.name}</p>
        <p className="mt-3">{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)} ({r.nights} nights)</p>
        <p className="mt-1 font-semibold">Total: {pkr(folio?.total)} · Balance: {pkr(folio?.balance)}</p>
        {folio?.balance > 0 && (
          <Button variant="gold" className="mt-4 w-full" disabled={payNow.busy} onClick={() => payNow.pay(r._id, folio.balance)}>
            {payNow.busy ? 'Processing…' : `Pay now ${payNow.stripe ? 'with Stripe' : 'by card'}`}
          </Button>
        )}
        <Msg text={msg.text} error={msg.error} />
      </div>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/guest" className="rounded-lg bg-navy px-5 py-3 text-white">Go to my dashboard</Link>
        <Link to="/guest/bookings" className="rounded-lg border border-navy px-5 py-3 text-navy">My bookings</Link>
      </div>
    </div>
  );
}
