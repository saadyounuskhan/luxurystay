import { useState } from 'react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { label, fmtTime } from '../../utils/format';
import { Card, Button, Spinner, PageHeader, Badge, Empty, Table, Td, Modal, Field, inputCls, Msg } from '../../components/common/ui';

export default function MaintenancePage() {
  const { data = [], isLoading } = useGet(['tickets'], '/maintenance');
  const { data: rooms = [] } = useGet(['rooms'], '/rooms');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ room: '', title: '', category: 'other', priority: 'medium' });
  const [err, setErr] = useState('');
  const update = useAction(({ id, ...b }) => api.patch(`/maintenance/${id}`, b), { invalidate: [['tickets'], ['rooms']] });
  const create = useAction((b) => api.post('/maintenance', b), { invalidate: [['tickets'], ['rooms']], onSuccess: () => setOpen(false), onError: setErr });
  const set = (e) => setF({ ...f, [e.target.name]: e.target.value });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Operations" title="Maintenance"><Button variant="gold" onClick={() => setOpen(true)}>Report issue</Button></PageHeader>
      <Card>
        {isLoading ? <Spinner /> : data.length === 0 ? <Empty /> : (
          <Table head={['Room', 'Issue', 'Priority', 'Reported', 'Status', '']} minWidth={720}>
            {data.map((t) => (
              <tr key={t._id}>
                <Td className="font-medium">{t.room?.number}</Td>
                <Td>{t.title}<div className="text-xs text-muted">{label(t.category)}</div></Td>
                <Td><Badge status={t.priority} /></Td>
                <Td className="text-xs">{t.reportedBy?.name} ({t.reportedBy?.role})<div className="text-muted">{fmtTime(t.createdAt)}</div></Td>
                <Td><Badge status={t.status} /></Td>
                <Td className="whitespace-nowrap text-right">
                  {t.status === 'open' && <Button variant="outline" className="h-9" onClick={() => update.mutate({ id: t._id, status: 'in_progress' })}>Start</Button>}
                  {t.status === 'in_progress' && <Button className="h-9" onClick={() => update.mutate({ id: t._id, status: 'resolved' })}>Resolved</Button>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={open} title="Report maintenance issue" onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-3">
          <Field label="Room" id="m-r"><select id="m-r" name="room" className={inputCls} value={f.room} onChange={set}><option value="">Choose…</option>{rooms.map((r) => <option key={r._id} value={r._id}>{r.number}</option>)}</select></Field>
          <Field label="Issue" id="m-t"><input id="m-t" name="title" className={inputCls} value={f.title} onChange={set} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" id="m-c"><select id="m-c" name="category" className={inputCls} value={f.category} onChange={set}>{['ac', 'electrical', 'plumbing', 'furniture', 'other'].map((c) => <option key={c} value={c}>{label(c)}</option>)}</select></Field>
            <Field label="Priority" id="m-p"><select id="m-p" name="priority" className={inputCls} value={f.priority} onChange={set}>{['low', 'medium', 'high', 'urgent'].map((c) => <option key={c} value={c}>{label(c)}</option>)}</select></Field>
          </div>
          <Msg text={err} error />
          <Button onClick={() => (!f.room || f.title.length < 3 ? setErr('Choose a room and describe the issue') : create.mutate(f))}>Submit</Button>
        </div>
      </Modal>
    </div>
  );
}
