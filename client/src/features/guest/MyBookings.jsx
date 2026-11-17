import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { pkr, fmtDate } from '../../utils/format';
import { Card, Badge, Button, Msg, Spinner, Empty, PageHeader, Modal, Field, inputCls, Table, Td } from '../../components/common/ui';

export default function MyBookings() {
  const { data = [], isLoading } = useGet(['myBookings'], '/reservations/me');
  const { data: reviews = [] } = useGet(['myFeedback'], '/feedback');
  const [msg, setMsg] = useState({});
  const [rate, setRate] = useState(null);

  const cancel = useAction((id) => api.post(`/reservations/${id}/cancel`), {
    invalidate: [['myBookings'], ['current']],
    onSuccess: (res) => setMsg({ text: res.message }),
    onError: (e) => setMsg({ text: e, error: true }),
  });
  const rated = new Set(reviews.map((f) => f.reservation));
  const navigate = useNavigate();
  const invoice = useAction((id) => api.post('/invoices', { reservation: id }), { onSuccess: (r) => navigate(`/guest/invoices/${r.data._id}`), onError: (e) => setMsg({ text: e, error: true }) });

  return (
    <div>
      <PageHeader eyebrow="Your stays" title="My bookings"><Link to="/#rooms" className="rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-navy">Book another stay</Link></PageHeader>
      <Msg text={msg.text} error={msg.error} />
      <Card className="mt-4">
        {isLoading ? <Spinner /> : data.length === 0 ? <Empty text="No bookings yet" /> : (
          <Table head={['Booking', 'Hotel', 'Room', 'Dates', 'Total', 'Status', '']}>
            {data.map((r) => (
              <tr key={r._id}>
                <Td className="font-medium">{r.code}</Td>
                <Td>{r.branch?.city}</Td>
                <Td>{r.roomType?.name}{r.room ? ` · ${r.room.number}` : ''}</Td>
                <Td>{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</Td>
                <Td>{pkr(r.totalAmount)}</Td>
                <Td><Badge status={r.status} /></Td>
                <Td className="text-right">
                  {['pending', 'confirmed'].includes(r.status) && (
                    <Button variant="danger" className="h-9" onClick={() => window.confirm(`Cancel ${r.code}?`) && cancel.mutate(r._id)}>Cancel</Button>
                  )}
                  {r.status === 'checked_out' && !rated.has(r._id) && <Button variant="outline" className="h-9" onClick={() => setRate(r)}>Rate stay</Button>}
                  {r.status === 'checked_out' && rated.has(r._id) && <span className="text-xs text-muted">Rated ✓</span>}
                  {r.status !== 'cancelled' && <Button variant="ghost" className="h-9" onClick={() => invoice.mutate(r._id)}>Invoice</Button>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <RateModal booking={rate} onClose={() => setRate(null)} onDone={(t) => { setRate(null); setMsg({ text: t }); }} />
    </div>
  );
}

function RateModal({ booking, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const send = useAction((b) => api.post('/feedback', b), { invalidate: [['myFeedback']], onSuccess: (r) => onDone(r.message), onError: setErr });
  return (
    <Modal open={!!booking} title="Rate your stay" onClose={onClose}>
      <div className="flex gap-2" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)}
            className={`h-12 w-12 rounded-lg border border-line text-2xl ${n <= rating ? 'text-gold' : 'text-[#D3CBB8]'}`}>★</button>
        ))}
      </div>
      <div className="mt-4"><Field label="Comment" id="fb"><textarea id="fb" rows={3} className={`${inputCls} h-auto py-2`} value={comment} onChange={(e) => setComment(e.target.value)} /></Field></div>
      <Msg text={err} error />
      <Button className="mt-4 w-full" disabled={send.isPending} onClick={() => send.mutate({ reservation: booking._id, rating, comment })}>Submit</Button>
    </Modal>
  );
}
