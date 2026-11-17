import { useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useGet, useAction, downloadFile } from '../../api/hooks';
import { api } from '../../api/axios';
import { pkr, fmtDay, fmtDate } from '../../utils/format';
import { Card, Button, Spinner, PageHeader, Table, Td, Msg, Empty } from '../../components/common/ui';

export default function ReportsPage() {
  const { data: fc, isLoading } = useGet(['forecast'], '/reports/forecast');
  const { data: prices = [] } = useGet(['pricing'], '/pricing/suggestions');
  const [msg, setMsg] = useState('');
  const approve = useAction((b) => api.post('/pricing/approve', b), { invalidate: [['pricing']], onSuccess: () => setMsg('Price approved') });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Analytics" title="Reports and forecast">
        <Button variant="outline" onClick={() => downloadFile('/reports/export', 'bookings.csv')}>Export bookings (CSV)</Button>
      </PageHeader>
      <Card title="Demand forecast, next 14 days">
        <p className="mb-3 text-sm text-muted">Booked = rooms already sold. Expected = booked plus the usual extra bookings for that weekday (average of last 8 weeks).</p>
        {isLoading || !fc ? <Spinner /> : (
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={fc.days.map((d) => ({ ...d, day: fmtDay(d.date) }))}>
                <CartesianGrid vertical={false} stroke="#F0EADB" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={30} domain={[0, fc.totalRooms]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="booked" name="Booked rooms" fill="#141B2D" radius={[4, 4, 0, 0]} />
                <Line dataKey="expected" name="Expected rooms" stroke="#C9A24D" strokeWidth={3} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      <Card title="Smart pricing suggestions">
        <p className="mb-3 text-sm text-muted">Rules: high occupancy raises the price, low occupancy lowers it, weekends cost more. Nothing changes until a manager approves.</p>
        <Msg text={msg} />
        {prices.length === 0 ? <Empty text="No changes suggested" /> : (
          <Table head={['Date', 'Room type', 'Base', 'Suggested', 'Why', '']} minWidth={700}>
            {prices.map((p) => (
              <tr key={p.roomType._id + p.date}>
                <Td>{fmtDate(p.date)}</Td>
                <Td>{p.roomType.name}</Td>
                <Td>{pkr(p.basePrice)}</Td>
                <Td className={`font-semibold ${p.suggested > p.basePrice ? 'text-[#2F6B3F]' : 'text-[#8A2414]'}`}>{pkr(p.suggested)} ({p.suggested > p.basePrice ? '+' : ''}{Math.round(((p.suggested - p.basePrice) / p.basePrice) * 100)}%)</Td>
                <Td className="text-xs">{p.reason}</Td>
                <Td className="text-right">{p.approvedPrice ? <span className="text-xs text-[#2F6B3F]">Approved ✓</span> : <Button variant="gold" className="h-9" onClick={() => approve.mutate({ roomType: p.roomType._id, date: p.date, price: p.suggested })}>Approve</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
