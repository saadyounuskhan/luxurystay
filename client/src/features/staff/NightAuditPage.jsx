import { useState } from 'react';
import { useGet, useAction, openPdf } from '../../api/hooks';
import { api } from '../../api/axios';
import { pkr, fmtDate } from '../../utils/format';
import { Card, Button, Spinner, PageHeader, Empty, Table, Td, Msg, Badge } from '../../components/common/ui';

export default function NightAuditPage() {
  const { data = [], isLoading } = useGet(['nightAudits'], '/night-audit');
  const [msg, setMsg] = useState({});
  const run = useAction(() => api.post('/night-audit/run'), { invalidate: [['nightAudits'], ['kpis']], onSuccess: (r) => setMsg({ text: r.message }), onError: (e) => setMsg({ text: e, error: true }) });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="End of day" title="Night audit">
        <Button variant="gold" disabled={run.isPending} onClick={() => window.confirm('Close today? Guests who did not arrive will be marked as no-show.') && run.mutate()}>
          {run.isPending ? 'Running…' : 'Run night audit now'}
        </Button>
      </PageHeader>
      <Card>
        <p className="text-sm text-[#4A4538]">Runs by itself every night at 23:55. It marks no-shows, frees their rooms, and saves the day's occupancy, revenue (cash, card, online) and open balances for each hotel.</p>
        <Msg text={msg.text} error={msg.error} />
      </Card>
      <Card title="Reports">
        {isLoading ? <Spinner /> : data.length === 0 ? <Empty text="No reports yet. Run the first night audit." /> : (
          <Table head={['Date', 'Hotel', 'Occupancy', 'Revenue', 'ADR', 'Arrivals / departures', 'No-shows', '']} minWidth={860}>
            {data.map((a) => (
              <tr key={a._id}>
                <Td className="font-medium">{fmtDate(a.date)}<div className="text-xs text-muted">{a.auto ? 'Automatic' : `By ${a.runBy?.name || 'staff'}`}</div></Td>
                <Td>{a.branch?.city}</Td>
                <Td>{a.occupancy}% <span className="text-xs text-muted">({a.occupiedRooms}/{a.totalRooms})</span></Td>
                <Td>{pkr(a.revenue)}</Td>
                <Td>{pkr(a.adr)}</Td>
                <Td>{a.arrivals} / {a.departures}</Td>
                <Td>{a.noShows ? <Badge status="cancelled">{a.noShows}</Badge> : '0'}</Td>
                <Td className="text-right"><Button variant="outline" className="h-9" onClick={() => openPdf(`/night-audit/${a._id}/pdf`)}>PDF</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
