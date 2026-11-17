import { useState } from 'react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { fmtTime } from '../../utils/format';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useGet(['notifications'], '/notifications', undefined, { refetchInterval: 60000 });
  const readAll = useAction(() => api.patch('/notifications/read-all'), { invalidate: [['notifications']] });

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative h-11 rounded-lg border border-line bg-white px-4 text-sm" aria-expanded={open}>
        Notifications
        {data?.unread > 0 && <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-navy">{data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-line bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            <button className="text-xs text-gold-dark" onClick={() => readAll.mutate()}>Mark all read</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(data?.items || []).length === 0 && <p className="py-6 text-center text-sm text-muted">No notifications</p>}
            {(data?.items || []).map((n) => (
              <div key={n._id} className={`rounded-lg p-2 text-sm ${n.isRead ? '' : 'bg-ivory'}`}>
                <p className="font-medium">{n.title}</p>
                <p className="text-xs text-muted">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted">{fmtTime(n.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
