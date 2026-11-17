import { useState } from 'react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { fmtDate } from '../../utils/format';
import { Card, Button, Spinner, PageHeader, Badge, Empty, Table, Td, Modal, Field, inputCls, Msg } from '../../components/common/ui';

export default function PromosPage() {
  const { data = [], isLoading } = useGet(['promos'], '/promos');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: '', description: '', percent: 10, maxUses: 100, minNights: 1, validTo: '' });
  const [err, setErr] = useState('');
  const create = useAction((b) => api.post('/promos', b), { invalidate: [['promos']], onSuccess: () => setOpen(false), onError: setErr });
  const toggle = useAction((p) => api.patch(`/promos/${p._id}`, { isActive: !p.isActive }), { invalidate: [['promos']] });
  const set = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setErr(''); };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Marketing" title="Promo codes"><Button variant="gold" onClick={() => setOpen(true)}>New code</Button></PageHeader>
      <Card>
        {isLoading ? <Spinner /> : data.length === 0 ? <Empty /> : (
          <Table head={['Code', 'Offer', 'Used', 'Min nights', 'Valid until', 'Status', '']} minWidth={760}>
            {data.map((p) => (
              <tr key={p._id}>
                <Td className="font-mono font-semibold">{p.code}</Td>
                <Td>{p.percent}% off<div className="text-xs text-muted">{p.description}</div></Td>
                <Td>
                  {p.used} / {p.maxUses}
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-line"><div className="h-1.5 rounded-full bg-gold" style={{ width: `${Math.min(100, (p.used / p.maxUses) * 100)}%` }} /></div>
                </Td>
                <Td>{p.minNights}</Td>
                <Td>{p.validTo ? fmtDate(p.validTo) : 'No end'}</Td>
                <Td><Badge status={p.isActive ? 'available' : 'cancelled'}>{p.isActive ? 'Active' : 'Off'}</Badge></Td>
                <Td className="text-right"><Button variant="outline" className="h-9" onClick={() => toggle.mutate(p)}>{p.isActive ? 'Turn off' : 'Turn on'}</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={open} title="New promo code" onClose={() => setOpen(false)}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code" id="pc-c"><input id="pc-c" name="code" className={`${inputCls} uppercase`} value={f.code} onChange={set} placeholder="SUMMER15" /></Field>
          <Field label="Discount %" id="pc-p"><input id="pc-p" name="percent" type="number" min="1" max="90" className={inputCls} value={f.percent} onChange={set} /></Field>
          <div className="col-span-2"><Field label="Description" id="pc-d"><input id="pc-d" name="description" className={inputCls} value={f.description} onChange={set} /></Field></div>
          <Field label="Max uses" id="pc-m"><input id="pc-m" name="maxUses" type="number" className={inputCls} value={f.maxUses} onChange={set} /></Field>
          <Field label="Min nights" id="pc-n"><input id="pc-n" name="minNights" type="number" className={inputCls} value={f.minNights} onChange={set} /></Field>
          <div className="col-span-2"><Field label="Valid until (optional)" id="pc-v"><input id="pc-v" name="validTo" type="date" className={inputCls} value={f.validTo} onChange={set} /></Field></div>
        </div>
        <Msg text={err} error />
        <Button className="mt-4 w-full" onClick={() => (!/^[A-Za-z0-9]{3,20}$/.test(f.code) ? setErr('Code: 3–20 letters or numbers') : create.mutate({ ...f, percent: Number(f.percent), maxUses: Number(f.maxUses), minNights: Number(f.minNights), validTo: f.validTo || undefined }))}>Create code</Button>
      </Modal>
    </div>
  );
}
