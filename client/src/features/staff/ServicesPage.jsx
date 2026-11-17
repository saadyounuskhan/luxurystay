import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { label, fmtTime, pkr } from '../../utils/format';
import { Card, Button, Spinner, PageHeader, Badge, Empty, Table, Td } from '../../components/common/ui';

const NEXT = { requested: ['accepted', 'Accept'], accepted: ['in_progress', 'Start'], in_progress: ['done', 'Done'] };

export default function ServicesPage() {
  const { data = [], isLoading } = useGet(['services'], '/service-requests');
  const update = useAction(({ id, ...b }) => api.patch(`/service-requests/${id}`, b), { invalidate: [['services']] });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Guests" title="Service requests" />
      <Card>
        {isLoading ? <Spinner /> : data.length === 0 ? <Empty /> : (
          <Table head={['Room', 'Guest', 'Request', 'Price', 'Time', 'Status', '']} minWidth={760}>
            {data.map((s) => (
              <tr key={s._id}>
                <Td className="font-medium">{s.room?.number}</Td>
                <Td>{s.guest?.name}</Td>
                <Td>{label(s.type)}<div className="text-xs text-muted">{s.details}</div></Td>
                <Td>{s.price ? pkr(s.price) : 'Free'}</Td>
                <Td className="text-xs">{fmtTime(s.createdAt)}</Td>
                <Td><Badge status={s.status} /></Td>
                <Td className="text-right">{NEXT[s.status] && <Button className="h-9" onClick={() => update.mutate({ id: s._id, status: NEXT[s.status][0] })}>{NEXT[s.status][1]}</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
