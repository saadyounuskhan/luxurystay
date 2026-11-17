import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { pkr, fmtDate, addDays, label } from '../../utils/format';
import { Card, Button, Msg, Spinner, Empty, PageHeader, Table, Td, Badge, Modal, Field, inputCls } from '../../components/common/ui';
import FolioModal from './FolioModal';

const STATUSES = ['', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

export default function ReservationsPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [walkIn, setWalkIn] = useState(false);
  const [folioFor, setFolioFor] = useState(null);
  const [msg, setMsg] = useState({});
  const { data, isLoading } = useQueryList(status, q, page);
  const cancel = useAction((id) => api.post(`/reservations/${id}/cancel`), { invalidate: [['reservations']], onSuccess: (r) => setMsg({ text: r.message }), onError: (e) => setMsg({ text: e, error: true }) });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Bookings" title="Reservations"><Button variant="gold" onClick={() => setWalkIn(true)}>New booking</Button></PageHeader>
      <Msg text={msg.text} error={msg.error} />
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="sr-only" htmlFor="r-q">Search code</label>
          <input id="r-q" className={`${inputCls} max-w-xs`} placeholder="Search booking code" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <label className="sr-only" htmlFor="r-s">Status</label>
          <select id="r-s" className={`${inputCls} max-w-[200px]`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s ? label(s) : 'All statuses'}</option>)}
          </select>
        </div>
        {isLoading ? <Spinner /> : !data?.items.length ? <Empty /> : (
          <>
            <Table head={['Code', 'Guest', 'Room', 'Dates', 'Total', 'Status', '']} minWidth={760}>
              {data.items.map((r) => (
                <tr key={r._id}>
                  <Td className="font-medium">{r.code}</Td>
                  <Td>{r.guest?.name}</Td>
                  <Td>{r.room?.number} · {r.roomType?.name}</Td>
                  <Td>{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</Td>
                  <Td>{pkr(r.totalAmount)}</Td>
                  <Td><Badge status={r.status} /></Td>
                  <Td className="whitespace-nowrap text-right">
                    <Button variant="ghost" className="h-9" onClick={() => setFolioFor(r)}>Bill</Button>
                    {r.status === 'confirmed' && <Button variant="danger" className="h-9" onClick={() => window.confirm(`Cancel ${r.code}?`) && cancel.mutate(r._id)}>Cancel</Button>}
                  </Td>
                </tr>
              ))}
            </Table>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted">{data.meta.total} bookings</span>
              <div className="flex gap-2">
                <Button variant="outline" className="h-9" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" className="h-9" disabled={page * data.meta.limit >= data.meta.total} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
      <WalkInModal open={walkIn} onClose={() => setWalkIn(false)} onDone={(t) => { setWalkIn(false); setMsg({ text: t }); }} />
      <FolioModal reservation={folioFor} onClose={() => setFolioFor(null)} />
    </div>
  );
}

// list endpoint returns { data, meta } so we read the raw response here
function useQueryList(status, q, page) {
  return useQuery({
    queryKey: ['reservations', status, q, page],
    queryFn: () => api.get('/reservations', { params: { status: status || undefined, q: q || undefined, page } }).then((r) => ({ items: r.data.data, meta: r.data.meta })),
  });
}

function WalkInModal({ open, onClose, onDone }) {
  const { data: types = [] } = useGet(['staffRoomTypes'], '/room-types');
  const [f, setF] = useState({ name: '', email: '', phone: '', roomType: '', checkIn: addDays(0), checkOut: addDays(1), adults: 1 });
  const [err, setErr] = useState('');
  const book = useAction((b) => api.post('/reservations', b), { invalidate: [['reservations'], ['frontdesk'], ['rooms']], onSuccess: (r) => onDone(r.message), onError: setErr });
  const set = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setErr(''); };
  const submit = () => {
    if (!f.name || !f.email || !f.roomType) return setErr('Fill guest name, email and room type');
    book.mutate({ roomType: f.roomType, checkIn: f.checkIn, checkOut: f.checkOut, adults: Number(f.adults), walkIn: { name: f.name, email: f.email, phone: f.phone } });
  };
  return (
    <Modal open={open} title="New booking (walk-in / phone)" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Guest name" id="w-n"><input id="w-n" name="name" className={inputCls} value={f.name} onChange={set} /></Field></div>
        <Field label="Email" id="w-e"><input id="w-e" name="email" type="email" className={inputCls} value={f.email} onChange={set} /></Field>
        <Field label="Phone" id="w-p"><input id="w-p" name="phone" className={inputCls} value={f.phone} onChange={set} /></Field>
        <div className="col-span-2"><Field label="Room type" id="w-t"><select id="w-t" name="roomType" className={inputCls} value={f.roomType} onChange={set}><option value="">Choose…</option>{types.map((t) => <option key={t._id} value={t._id}>{t.branch?.city} · {t.name} · {pkr(t.basePrice)}</option>)}</select></Field></div>
        <Field label="Check-in" id="w-i"><input id="w-i" name="checkIn" type="date" className={inputCls} value={f.checkIn} onChange={set} /></Field>
        <Field label="Check-out" id="w-o"><input id="w-o" name="checkOut" type="date" className={inputCls} value={f.checkOut} onChange={set} /></Field>
        <Field label="Adults" id="w-a"><select id="w-a" name="adults" className={inputCls} value={f.adults} onChange={set}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></Field>
      </div>
      <Msg text={err} error />
      <Button className="mt-4 w-full" disabled={book.isPending} onClick={submit}>{book.isPending ? 'Booking…' : 'Create booking'}</Button>
    </Modal>
  );
}
