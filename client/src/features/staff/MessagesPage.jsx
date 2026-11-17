import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { fmtTime } from '../../utils/format';
import { Card, Button, Spinner, PageHeader, Badge, Empty } from '../../components/common/ui';

export default function MessagesPage() {
  const { data = [], isLoading } = useGet(['messages'], '/contact');
  const update = useAction(({ id, status }) => api.patch(`/contact/${id}`, { status }), { invalidate: [['messages']] });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={`${data.filter((m) => m.status === 'new').length} new`} title="Website messages" />
      {isLoading ? <Spinner /> : data.length === 0 ? <Card><Empty /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((m) => (
            <Card key={m._id}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-semibold">{m.name}</p><p className="text-xs text-muted">{m.email}{m.phone ? ` · ${m.phone}` : ''}{m.branch ? ` · ${m.branch.city}` : ''}</p></div>
                <Badge status={m.status === 'new' ? 'pending' : m.status === 'replied' ? 'available' : 'closed'}>{m.status}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-navy">{m.subject}</p>
              <p className="mt-1 text-sm text-[#4A4538]">{m.message}</p>
              <p className="mt-2 text-xs text-muted">{fmtTime(m.createdAt)}</p>
              <div className="mt-3 flex gap-2">
                <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} onClick={() => update.mutate({ id: m._id, status: 'replied' })} className="inline-flex h-9 items-center rounded-lg bg-navy px-3 text-sm text-white">Reply by email</a>
                {m.status !== 'closed' && <Button variant="outline" className="h-9" onClick={() => update.mutate({ id: m._id, status: 'closed' })}>Close</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
