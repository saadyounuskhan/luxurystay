import { useState, lazy, Suspense } from 'react';
import SafeBox from '../../components/common/SafeBox';
const Building3D = lazy(() => import('../../components/three/Building3D'));
import { motion } from 'motion/react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { label } from '../../utils/format';
import { Card, Spinner, Modal, Button, Badge } from '../../components/common/ui';

const COLORS = {
  available: ['#E4F1E6', '#1F5A2E', '#9CC9A6'],
  occupied: ['#E3E8F5', '#1E2F63', '#9AA9D6'],
  reserved: ['#FBEFD6', '#7A4F00', '#E3C27A'],
  maintenance: ['#F8E1DD', '#8A2414', '#E1A193'],
};

// Live floor map. Updates by itself through Socket.io when any room changes.
export default function RoomMap() {
  const { data: rooms = [], isLoading } = useGet(['rooms'], '/rooms');
  const role = useAuthStore((s) => s.user.role);
  const [sel, setSel] = useState(null);
  const [view, setView] = useState('3d');
  const update = useAction((body) => api.patch(`/rooms/${sel._id}`, body), { invalidate: [['rooms'], ['kpis']], onSuccess: () => setSel(null) });

  if (isLoading) return <Spinner />;
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => b - a);
  const count = (s) => rooms.filter((r) => r.status === s).length;

  return (
    <Card title="Live room status" action={
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-xs font-medium text-[#2F6B3F]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#2F6B3F]" />Live</span>
        <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="View">
          {['3d', '2d'].map((v) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`h-8 rounded-md px-3 text-xs font-semibold uppercase ${view === v ? 'bg-navy text-white' : 'text-navy'}`}>{v}</button>)}
        </div>
      </div>}>
      {view === '3d' ? (
        <SafeBox fallback={<p className="text-sm text-muted">3D is not supported on this device. Switch to 2D.</p>}>
          <Suspense fallback={<Spinner />}><Building3D rooms={rooms} onPick={setSel} /></Suspense>
        </SafeBox>
      ) : (
      <div className="flex flex-col gap-3">
        {floors.map((f) => (
          <div key={f} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-muted">Floor {f}</span>
            <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-6">
              {rooms.filter((r) => r.floor === f).map((r, i) => {
                const [bg, fg, border] = COLORS[r.status];
                return (
                  <motion.button key={r._id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                    whileHover={{ y: -3 }} onClick={() => setSel(r)}
                    className="flex flex-col items-center rounded-xl border py-2" style={{ background: bg, color: fg, borderColor: border }}
                    aria-label={`Room ${r.number}, ${r.status}, ${r.condition}`}>
                    <span className="text-sm font-semibold">{r.number}</span>
                    <span className="text-[10px]">{label(r.status)}{r.condition === 'dirty' ? ' · dirty' : ''}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      )}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#4A4538]">
        {Object.keys(COLORS).map((s) => <span key={s}><span className="mr-1 inline-block h-3 w-3 rounded" style={{ background: COLORS[s][2] }} />{label(s)} {count(s)}</span>)}
      </div>

      <Modal open={!!sel} title={sel ? `Room ${sel.number}` : ''} onClose={() => setSel(null)}>
        {sel && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">{sel.roomType?.name} · Floor {sel.floor}</p>
            <div className="flex gap-2"><Badge status={sel.status} /><Badge status={sel.condition} /></div>
            <p className="text-xs font-medium text-muted">Set condition</p>
            <div className="flex flex-wrap gap-2">
              {['clean', 'dirty', 'inspected'].map((c) => <Button key={c} variant="outline" className="h-9" onClick={() => update.mutate({ condition: c })}>{label(c)}</Button>)}
            </div>
            {role !== 'housekeeping' && sel.status !== 'occupied' && (
              <>
                <p className="text-xs font-medium text-muted">Set status</p>
                <div className="flex flex-wrap gap-2">
                  {['available', 'maintenance'].map((s) => <Button key={s} variant="outline" className="h-9" onClick={() => update.mutate({ status: s })}>{label(s)}</Button>)}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
