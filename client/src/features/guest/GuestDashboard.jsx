import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { pkr, fmtDate, fmtTime, label } from '../../utils/format';
import { Card, Badge, Button, Msg, Spinner, Empty, Modal, Field, inputCls } from '../../components/common/ui';
import { usePayNow } from '../../api/payments';

const SERVICES = [
  ['room_service', 'Room service', 'Food and drinks'],
  ['housekeeping', 'Housekeeping', 'Clean my room'],
  ['laundry', 'Laundry', 'PKR 1,500'],
  ['wake_up', 'Wake-up call', 'Set a time'],
  ['transport', 'Transport', 'PKR 3,500'],
  ['late_checkout', 'Late checkout', 'PKR 5,000'],
];

export default function GuestDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useGet(['current'], '/reservations/current');
  const { data: me } = useGet(['me'], '/auth/me');
  const { data: services = [] } = useGet(['services'], '/service-requests');
  const [svc, setSvc] = useState(null);
  const [details, setDetails] = useState('');
  const [issue, setIssue] = useState(false);
  const [msg, setMsg] = useState({});

  const r = data?.reservation;
  const folio = data?.folio;
  const inHouse = r?.status === 'checked_in';

  const request = useAction((body) => api.post('/service-requests', body), {
    invalidate: [['services']],
    onSuccess: () => { setSvc(null); setDetails(''); setMsg({ text: 'Request sent. We are on it.' }); },
    onError: (e) => setMsg({ text: e, error: true }),
  });
  const payNow = usePayNow({ onDone: (t) => setMsg({ text: t }), onError: (e) => setMsg({ text: e, error: true }) });
  const report = useAction((body) => api.post('/maintenance', body), {
    onSuccess: () => { setIssue(false); setMsg({ text: 'Issue reported. Our team will fix it soon.' }); },
    onError: (e) => setMsg({ text: e, error: true }),
  });

  if (isLoading) return <Spinner />;
  const points = me?.profile?.loyalty?.points || 0;
  const tier = me?.profile?.loyalty?.tier || 'silver';
  const next = tier === 'silver' ? 2000 : 10000;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted">Welcome back</p>
        <h1 className="font-display text-4xl font-semibold text-navy">{user.name.split(' ')[0]}, {inHouse ? 'enjoy your stay' : 'plan your next stay'}</h1>
      </div>
      <Msg text={msg.text} error={msg.error} />

      {!r && (
        <Card>
          <Empty text="You have no upcoming stay." />
          <div className="text-center"><Link to="/#rooms" className="rounded-lg bg-gold px-5 py-3 font-semibold text-navy">Book a room</Link></div>
        </Card>
      )}

      {r && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-between gap-6 rounded-2xl bg-navy p-6 text-[#E9DDBF]">
            <div className="flex min-w-[220px] flex-1 flex-col gap-4">
              <p className="text-xs tracking-[0.2em] text-gold">{inHouse ? 'CURRENT STAY · CHECKED IN' : 'UPCOMING STAY'}</p>
              <p className="font-display text-4xl leading-tight text-white">{r.roomType.name}{r.room ? ` · Room ${r.room.number}` : ''}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-[#A9AFC2]">Check-in</dt><dd className="font-medium text-white">{fmtDate(r.checkIn)} · {r.branch.checkInTime}</dd></div>
                <div><dt className="text-[#A9AFC2]">Check-out</dt><dd className="font-medium text-white">{fmtDate(r.checkOut)} · {r.branch.checkOutTime}</dd></div>
                <div><dt className="text-[#A9AFC2]">Booking</dt><dd className="font-medium text-white">{r.code}</dd></div>
                <div><dt className="text-[#A9AFC2]">Hotel</dt><dd className="font-medium text-white">{r.branch.name}</dd></div>
              </dl>
              {inHouse && <button className="h-11 w-fit rounded-lg border border-navy-soft px-4 text-sm text-[#E9DDBF] hover:bg-navy-soft" onClick={() => setIssue(true)}>Report an issue</button>}
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={inHouse ? `LUXURYSTAY:${r.code}:${r.room?.number}` : `LUXURYSTAY:${r.code}`} size={120} fgColor="#141B2D" />
              </div>
              <span className="text-xs text-gold">{inHouse ? 'Digital room key' : 'Show at check-in'}</span>
            </div>
          </motion.section>

          <Card title="Bill so far">
            {folio?.items.map((i) => (
              <div key={i._id} className="flex justify-between py-1.5 text-sm"><span className="text-[#4A4538]">{i.description}</span><span className="font-medium">{pkr(i.amount)}</span></div>
            ))}
            <div className="flex justify-between py-1.5 text-sm"><span className="text-[#4A4538]">Tax ({folio?.taxRate}%)</span><span>{pkr(folio?.taxAmount)}</span></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3"><span className="font-semibold">Total</span><span className="font-display text-3xl font-semibold text-navy">{pkr(folio?.total)}</span></div>
            <div className="flex justify-between text-sm text-muted"><span>Paid {pkr(folio?.paid)}</span><span>Balance {pkr(folio?.balance)}</span></div>
            {folio?.balance > 0 && (
              <Button variant="gold" className="mt-4 w-full" disabled={payNow.busy} onClick={() => payNow.pay(r._id, folio.balance)}>
                {payNow.busy ? 'Processing…' : `Pay ${pkr(folio.balance)} ${payNow.stripe ? 'securely with Stripe' : 'by card'}`}
              </Button>
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Request a service">
          {!inHouse && <p className="mb-3 text-sm text-muted">Available once you are checked in.</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SERVICES.map(([key, t, d]) => (
              <button key={key} disabled={!inHouse} onClick={() => setSvc(key)}
                className="min-h-20 rounded-xl border border-line bg-[#FBF8F1] p-3 text-left transition hover:border-gold disabled:opacity-50">
                <span className="block text-sm font-semibold">{t}</span><span className="text-xs text-muted">{d}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Gold rewards">
          <p className="font-display text-5xl font-semibold text-gold-dark">{points.toLocaleString()}<span className="ml-2 font-sans text-sm text-muted">points</span></p>
          <p className="mt-1 text-sm capitalize">{tier} member</p>
          <div className="mt-3 h-2.5 rounded-full bg-[#F0EADB]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (points / next) * 100)}%` }} transition={{ duration: 1.2 }} className="h-2.5 rounded-full bg-gold" />
          </div>
          {tier !== 'platinum' && <p className="mt-2 text-xs text-muted">{(next - points).toLocaleString()} points to {tier === 'silver' ? 'Gold' : 'Platinum'}</p>}
        </Card>
      </div>

      <Card title="My requests">
        {services.length === 0 && <Empty text="No requests yet" />}
        {services.slice(0, 8).map((s) => (
          <div key={s._id} className="flex items-center justify-between border-t border-[#F0EADB] py-3 first:border-0">
            <div><p className="text-sm font-medium">{label(s.type)}</p><p className="text-xs text-muted">{s.details || '—'} · {fmtTime(s.createdAt)}</p></div>
            <Badge status={s.status} />
          </div>
        ))}
      </Card>

      <Modal open={!!svc} title={svc ? label(svc) : ''} onClose={() => setSvc(null)}>
        <Field label="Details" id="svc-d">
          <textarea id="svc-d" rows={3} className={`${inputCls} h-auto py-2`} value={details} onChange={(e) => setDetails(e.target.value)}
            placeholder={svc === 'wake_up' ? 'Tomorrow 7:00 AM' : svc === 'transport' ? 'Airport, 5 PM' : 'Tell us what you need'} />
        </Field>
        <Button className="mt-4 w-full" disabled={request.isPending} onClick={() => request.mutate({ type: svc, details })}>Send request</Button>
      </Modal>

      <IssueModal open={issue} onClose={() => setIssue(false)} room={r?.room?._id} onSubmit={(b) => report.mutate(b)} busy={report.isPending} />
    </div>
  );
}

function IssueModal({ open, onClose, room, onSubmit, busy }) {
  const [f, setF] = useState({ title: '', category: 'ac', priority: 'medium', description: '' });
  const [err, setErr] = useState('');
  const set = (e) => setF({ ...f, [e.target.name]: e.target.value });
  return (
    <Modal open={open} title="Report an issue" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="What is wrong?" id="i-t"><input id="i-t" name="title" className={inputCls} value={f.title} onChange={set} placeholder="AC not cooling" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" id="i-c"><select id="i-c" name="category" className={inputCls} value={f.category} onChange={set}>{['ac', 'electrical', 'plumbing', 'furniture', 'other'].map((c) => <option key={c} value={c}>{label(c)}</option>)}</select></Field>
          <Field label="Urgency" id="i-p"><select id="i-p" name="priority" className={inputCls} value={f.priority} onChange={set}>{['low', 'medium', 'high', 'urgent'].map((c) => <option key={c} value={c}>{label(c)}</option>)}</select></Field>
        </div>
        <Field label="More details" id="i-d"><textarea id="i-d" name="description" rows={3} className={`${inputCls} h-auto py-2`} value={f.description} onChange={set} /></Field>
        <Msg text={err} error />
        <Button disabled={busy} onClick={() => (f.title.length < 3 ? setErr('Describe the issue') : onSubmit({ ...f, room }))}>Send</Button>
      </div>
    </Modal>
  );
}
