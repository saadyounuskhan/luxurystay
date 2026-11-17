import { useState } from 'react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { Msg } from '../../components/common/ui';
import { addDays, fmtDay } from '../../utils/format';
import { Card, Spinner, PageHeader, Button } from '../../components/common/ui';

const COLOR = { confirmed: '#C9D3EE', checked_in: '#C9A24D', checked_out: '#D3CBB8' };

// Booking calendar: rooms down the side, days across the top
export default function TapeChart() {
  const [offset, setOffset] = useState(-3);
  const from = addDays(offset);
  const { data, isLoading } = useGet(['tape'], '/front-desk/tape-chart', { from, days: 14 });
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [msg, setMsg] = useState({});
  const move = useAction(({ id, room }) => api.patch(`/reservations/${id}/move`, { room }), {
    invalidate: [['tape'], ['rooms'], ['frontdesk'], ['reservations']],
    onSuccess: (r) => setMsg({ text: r.message }), onError: (e) => setMsg({ text: e, error: true }),
  });
  if (isLoading || !data) return <Spinner />;
  const start = new Date(data.from).getTime();
  const days = Array.from({ length: data.days }, (_, i) => new Date(start + i * 86400000));
  const W = 56;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Front desk" title="Booking calendar">
        <Button variant="outline" onClick={() => setOffset(offset - 7)}>← Week</Button>
        <Button variant="outline" onClick={() => setOffset(-3)}>Today</Button>
        <Button variant="outline" onClick={() => setOffset(offset + 7)}>Week →</Button>
      </PageHeader>
      <p className="-mt-3 text-sm text-muted">Drag a booking onto another room to move the guest. Bookings that clash are refused.</p>
      <Msg text={msg.text} error={msg.error} />
      <Card>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 90 + W * data.days }}>
            <div className="flex border-b border-line text-[11px] text-muted">
              <div className="w-[90px] shrink-0 py-2">Room</div>
              {days.map((d) => <div key={d} style={{ width: W }} className={`shrink-0 py-2 text-center ${d.toDateString() === new Date().toDateString() ? 'font-semibold text-navy' : ''}`}>{fmtDay(d)}</div>)}
            </div>
            {data.rooms.map((room) => (
              <div key={room._id}
                onDragOver={(e) => { if (drag) { e.preventDefault(); setOver(room._id); } }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => { e.preventDefault(); setOver(null); if (drag && drag.room !== room._id) move.mutate({ id: drag.id, room: room._id }); setDrag(null); }}
                className={`relative flex h-10 items-center border-b border-[#F0EADB] transition ${over === room._id ? 'bg-gold/20' : ''}`}>
                <div className="w-[90px] shrink-0 text-sm"><span className="font-medium">{room.number}</span> <span className="text-[10px] text-muted">{room.roomType?.name?.split(' ')[0]}</span></div>
                {data.reservations.filter((r) => r.room === room._id).map((r) => {
                  const s = Math.max(0, (new Date(r.checkIn).getTime() - start) / 86400000);
                  const e = Math.min(data.days, (new Date(r.checkOut).getTime() - start) / 86400000);
                  if (e <= 0 || s >= data.days) return null;
                  return (
                    <div key={r._id} title={`${r.code} · ${r.guest?.name} · drag to move`}
                      draggable={['confirmed', 'checked_in'].includes(r.status)}
                      onDragStart={() => setDrag({ id: r._id, room: r.room })} onDragEnd={() => { setDrag(null); setOver(null); }}
                      className={`absolute top-1.5 h-7 truncate rounded-md px-2 text-[11px] leading-7 text-[#141B2D] shadow-sm ${['confirmed', 'checked_in'].includes(r.status) ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      style={{ left: 90 + s * W + 2, width: (e - s) * W - 4, background: COLOR[r.status] }}>{r.guest?.name}</div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-xs">{Object.entries(COLOR).map(([k, c]) => <span key={k}><span className="mr-1 inline-block h-3 w-3 rounded" style={{ background: c }} />{k.replace('_', ' ')}</span>)}</div>
      </Card>
    </div>
  );
}
