import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from 'motion/react';
import { useGet } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/common/ui';

const ago = (d) => { const s = Math.round((Date.now() - new Date(d)) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`; };
const DOT = { create: '#2F6B3F', update: '#C9A24D', delete: '#8A2414', login: '#4B63B8' };
const describe = (a) => {
  const who = a.user?.name || 'System';
  if (a.action === 'login') return `${who} signed in`;
  const what = a.after && typeof a.after === 'object' ? Object.entries(a.after).slice(0, 2).map(([k, v]) => `${k}: ${typeof v === 'object' ? '…' : v}`).join(', ') : '';
  return `${who} ${a.action}d ${a.entity}${what ? ` (${what})` : ''}`;
};

// Live list of what staff are doing right now (new items slide in instantly)
export default function ActivityFeed() {
  const { data = [] } = useGet(['activity'], '/activity');
  const [live, setLive] = useState([]);
  const token = useAuthStore((s) => s.accessToken);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!token) return;
    const s = io((import.meta.env.VITE_API_URL || '/api/v1').replace(/\/api\/v1\/?$/, '') || undefined, { auth: { token }, transports: ['websocket'] });
    s.on('activity', (item) => setLive((l) => [item, ...l].slice(0, 15)));
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => { s.disconnect(); clearInterval(t); };
  }, [token]);

  const items = [...live, ...data.filter((d) => !live.some((l) => l._id === d._id))].slice(0, 15);
  return (
    <Card title="Live activity" action={<span className="flex items-center gap-2 text-xs font-medium text-[#2F6B3F]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#2F6B3F]" />Live</span>}>
      <ul className="relative max-h-96 space-y-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {items.map((a) => (
            <motion.li key={a._id} layout initial={{ opacity: 0, x: -20, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} className="flex gap-3 rounded-lg px-2 py-2 hover:bg-ivory">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DOT[a.action] || '#6B6455' }} />
              <div className="min-w-0 text-sm">
                <p className="truncate">{describe(a)}</p>
                <p className="text-xs text-muted">{ago(a.at)}{a.user?.role ? ` · ${a.user.role}` : ''}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {items.length === 0 && <li className="py-6 text-center text-sm text-muted">No activity yet</li>}
      </ul>
    </Card>
  );
}
