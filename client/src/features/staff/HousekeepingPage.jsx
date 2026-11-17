import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { label, fmtTime } from '../../utils/format';
import { Card, Button, Spinner, PageHeader, Badge, Empty } from '../../components/common/ui';
import RoomMap from './RoomMap';

const COLS = [['pending', 'To do'], ['in_progress', 'Cleaning'], ['done', 'Done']];
const NEXT = { pending: ['in_progress', 'Start'], in_progress: ['done', 'Mark clean'], done: ['inspected', 'Inspected'] };

export default function HousekeepingPage({ mine = false }) {
  const user = useAuthStore((s) => s.user);
  const { data: tasks = [], isLoading } = useGet(['tasks'], '/housekeeping/tasks', mine ? { mine: 1 } : undefined);
  const { data: staff = [] } = useGet(['hkStaff'], '/users', { role: 'housekeeping' }, { enabled: user.role !== 'housekeeping' });
  const update = useAction(({ id, ...b }) => api.patch(`/housekeeping/tasks/${id}`, b), { invalidate: [['tasks'], ['rooms'], ['kpis']] });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Housekeeping" title={mine ? `Hello ${user.name.split(' ')[0]}, your tasks` : 'Housekeeping board'} />
      {isLoading ? <Spinner /> : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLS.map(([key, title]) => {
            const list = tasks.filter((t) => t.status === key);
            return (
              <Card key={key} title={`${title} (${list.length})`}>
                {list.length === 0 && <Empty text="All clear" />}
                <div className="flex flex-col gap-3">
                  {list.map((t) => (
                    <div key={t._id} className="rounded-xl border border-line bg-[#FBF8F1] p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-2xl font-semibold text-navy">Room {t.room?.number}</span>
                        <Badge status={t.priority} />
                      </div>
                      <p className="text-sm">{label(t.type)}</p>
                      <p className="text-xs text-muted">{t.assignedTo?.name || 'Unassigned'}{t.dueAt ? ` · due ${fmtTime(t.dueAt)}` : ''}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {NEXT[t.status] && <Button className="h-9" onClick={() => update.mutate({ id: t._id, status: NEXT[t.status][0] })}>{NEXT[t.status][1]}</Button>}
                        {user.role !== 'housekeeping' && (
                          <select aria-label="Assign to" className="h-9 rounded-lg border border-line bg-white px-2 text-xs" value={t.assignedTo?._id || ''} onChange={(e) => update.mutate({ id: t._id, assignedTo: e.target.value || null })}>
                            <option value="">Assign…</option>
                            {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <RoomMap />
    </div>
  );
}
