import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { pkr, label } from '../../utils/format';
import { Modal, Button, Field, inputCls, Msg, Spinner } from '../../components/common/ui';

export default function FolioModal({ reservation, onClose }) {
  const id = reservation?._id;
  const { data, isLoading } = useGet(['folio', id], `/folios/${id}`, undefined, { enabled: !!id });
  const [item, setItem] = useState({ type: 'food', description: '', qty: 1, unitPrice: '' });
  const [pay, setPay] = useState({ amount: '', method: 'cash' });
  const [msg, setMsg] = useState({});
  const inv = [['folio', id], ['frontdesk'], ['kpis']];
  const role = useAuthStore((st) => st.user.role);
  const navigate = useNavigate();
  const [discount, setDiscount] = useState('');
  const makeInvoice = useAction(() => api.post('/invoices', { reservation: id }), { invalidate: [['invoices']], onSuccess: (r) => navigate(`/staff/invoices/${r.data._id}`), onError: (e) => setMsg({ text: e, error: true }) });
  const applyDiscount = useAction((d) => api.patch(`/folios/${id}/discount`, { discount: d }), { invalidate: inv, onSuccess: () => setMsg({ text: 'Discount applied' }), onError: (e) => setMsg({ text: e, error: true }) });

  const add = useAction((b) => api.post(`/folios/${id}/items`, b), { invalidate: inv, onSuccess: () => { setItem({ ...item, description: '', unitPrice: '' }); setMsg({ text: 'Charge added' }); }, onError: (e) => setMsg({ text: e, error: true }) });
  const remove = useAction((itemId) => api.delete(`/folios/${id}/items/${itemId}`), { invalidate: inv });
  const takePayment = useAction((b) => api.post('/payments', b), { invalidate: inv, onSuccess: () => { setPay({ ...pay, amount: '' }); setMsg({ text: 'Payment received' }); }, onError: (e) => setMsg({ text: e, error: true }) });

  const f = data?.folio;
  return (
    <Modal open={!!reservation} title={`Bill · ${reservation?.code || ''}`} onClose={onClose}>
      {isLoading || !f ? <Spinner /> : (
        <div className="flex flex-col gap-4 text-sm">
          <div>
            {f.items.map((i) => (
              <div key={i._id} className="flex items-center justify-between border-b border-[#F0EADB] py-2">
                <span>{i.description} <span className="text-xs text-muted">({label(i.type)} × {i.qty})</span></span>
                <span className="flex items-center gap-2">{pkr(i.amount)}
                  {i.type !== 'room' && f.status === 'open' && <button aria-label="Remove charge" className="text-[#8A2414]" onClick={() => remove.mutate(i._id)}>×</button>}
                </span>
              </div>
            ))}
            {f.discount > 0 && <div className="flex justify-between py-1"><span>Discount</span><span>− {pkr(f.discount)}</span></div>}
            <div className="flex justify-between py-1"><span>Tax {f.taxRate}%</span><span>{pkr(f.taxAmount)}</span></div>
            <div className="flex justify-between py-1 font-semibold"><span>Total</span><span>{pkr(f.total)}</span></div>
            <div className="flex justify-between py-1"><span>Paid</span><span>{pkr(f.paid)}</span></div>
            <div className="flex justify-between py-1 font-semibold text-gold-dark"><span>Balance</span><span>{pkr(f.balance)}</span></div>
          </div>
          {f.status === 'open' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Charge type" id="c-t"><select id="c-t" className={inputCls} value={item.type} onChange={(e) => setItem({ ...item, type: e.target.value })}>{['food', 'laundry', 'transport', 'other'].map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></Field>
                <Field label="Amount (PKR)" id="c-a"><input id="c-a" type="number" className={inputCls} value={item.unitPrice} onChange={(e) => setItem({ ...item, unitPrice: e.target.value })} /></Field>
                <div className="col-span-2"><Field label="Description" id="c-d"><input id="c-d" className={inputCls} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} placeholder="Dinner, room 204" /></Field></div>
              </div>
              <Button variant="outline" onClick={() => add.mutate({ ...item, unitPrice: Number(item.unitPrice) })}>Add charge</Button>
              {f.balance > 0 && (
                <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <Field label="Payment" id="p-a"><input id="p-a" type="number" className={inputCls} placeholder={String(f.balance)} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
                  <Field label="Method" id="p-m"><select id="p-m" className={inputCls} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}><option value="cash">Cash</option><option value="card">Card</option></select></Field>
                  <Button variant="gold" onClick={() => takePayment.mutate({ reservation: id, amount: Number(pay.amount || f.balance), method: pay.method })}>Take</Button>
                </div>
              )}
            </>
          )}
          {f.status === 'open' && ['admin', 'manager'].includes(role) && (
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <Field label="Discount (PKR, manager only)" id="d-a"><input id="d-a" type="number" className={inputCls} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder={String(f.discount || 0)} /></Field>
              <Button variant="outline" onClick={() => applyDiscount.mutate(Number(discount || 0))}>Apply</Button>
            </div>
          )}
          <Button variant="primary" disabled={makeInvoice.isPending} onClick={() => makeInvoice.mutate()}>
            {data.invoice ? `Open invoice ${data.invoice.number}` : 'Generate invoice'}
          </Button>
          <Msg text={msg.text} error={msg.error} />
        </div>
      )}
    </Modal>
  );
}
