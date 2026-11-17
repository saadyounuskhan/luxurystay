import { useState } from 'react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { pkr, fmtDate } from '../../utils/format';
import { Card, Button, Msg, Spinner, Empty, PageHeader, Table, Td, Badge } from '../../components/common/ui';
import FolioModal from './FolioModal';

export default function FrontDesk() {
  const { data, isLoading } = useGet(['frontdesk'], '/front-desk/today');
  const [msg, setMsg] = useState({});
  const [folioFor, setFolioFor] = useState(null);
  const inv = [['frontdesk'], ['rooms'], ['kpis'], ['reservations']];
  const done = (res) => setMsg({ text: res.message });
  const fail = (e) => setMsg({ text: e, error: true });

  const checkIn = useAction((id) => api.post(`/reservations/${id}/check-in`), { invalidate: inv, onSuccess: done, onError: fail });
  const checkOut = useAction((id) => api.post(`/reservations/${id}/check-out`), { invalidate: inv, onSuccess: done, onError: fail });

  if (isLoading) return <Spinner />;
  const Section = ({ title, list, action }) => (
    <Card title={`${title} (${list.length})`}>
      {list.length === 0 ? <Empty /> : (
        <Table head={['Guest', 'Booking', 'Room', 'Dates', 'Status', '']}>
          {list.map((r) => (
            <tr key={r._id}>
              <Td className="font-medium">{r.guest?.name}<div className="text-xs text-muted">{r.guest?.phone}</div></Td>
              <Td>{r.code}</Td>
              <Td>{r.room?.number} · {r.roomType?.name}</Td>
              <Td>{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</Td>
              <Td><Badge status={r.status} /></Td>
              <Td className="whitespace-nowrap text-right">
                <Button variant="ghost" className="h-9" onClick={() => setFolioFor(r)}>Bill</Button>
                {action(r)}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Front desk" title="Today at reception" />
      <Msg text={msg.text} error={msg.error} />
      <Section title="Arrivals" list={data.arrivals} action={(r) => <Button className="h-9" disabled={checkIn.isPending} onClick={() => checkIn.mutate(r._id)}>Check in</Button>} />
      <Section title="Departures" list={data.departures} action={(r) => <Button variant="gold" className="h-9" disabled={checkOut.isPending} onClick={() => checkOut.mutate(r._id)}>Check out</Button>} />
      <Section title="In house" list={data.inHouse} action={(r) => <Button variant="outline" className="h-9" onClick={() => checkOut.mutate(r._id)}>Early check-out</Button>} />
      <FolioModal reservation={folioFor} onClose={() => setFolioFor(null)} />
    </div>
  );
}
