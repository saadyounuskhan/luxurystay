import { motion } from 'motion/react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useGet } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import { pkr, shortPkr, fmtDay } from '../../utils/format';
import { Card, Kpi, Spinner } from '../../components/common/ui';
import RoomMap from './RoomMap';
import HousekeepingPage from './HousekeepingPage';
import WelcomeBanner from './WelcomeBanner';
import ActivityFeed from './ActivityFeed';

export default function StaffDashboard() {
  const user = useAuthStore((s) => s.user);
  if (user.role === 'housekeeping') return <HousekeepingPage mine />;
  return <Overview user={user} />;
}

function Overview({ user }) {
  const { data: k, isLoading } = useGet(['kpis'], '/reports/kpis', undefined, { refetchInterval: 60000 });
  if (isLoading || !k) return <Spinner />;
  const daily = k.daily.map((d) => ({ ...d, day: fmtDay(d.date) }));

  return (
    <div className="flex flex-col gap-6">
 <WelcomeBanner name={user.name} role={user.role} line={`${k.today.occupiedRooms} of ${k.today.totalRooms} rooms are occupied, ${k.today.arrivals} guests arriving and ${k.today.pendingCleaning} rooms waiting for cleaning.`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} accent label="Occupancy today" value={`${k.today.occupancy}%`} note={`${k.today.occupiedRooms} of ${k.today.totalRooms} rooms`} trend={k.daily.slice(-14).map((d) => d.occupancy)} />
        <Kpi i={1} label="Revenue today" value={shortPkr(k.today.revenue)} note={`30 days: ${shortPkr(k.last30.revenue)}`} trend={k.daily.slice(-14).map((d) => d.revenue)} />
        <Kpi i={2} trend={k.daily.slice(-14).map((d) => d.sold)} label="Arrivals / departures" value={`${k.today.arrivals} / ${k.today.departures}`} note={`${k.today.openRequests} open guest requests`} />
        <Kpi i={3} label="Guest rating" value={k.rating ?? '—'} note={`${k.reviews} reviews in 90 days`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi i={4} label="ADR (avg daily rate)" value={shortPkr(k.last30.adr)} />
        <Kpi i={5} label="RevPAR" value={shortPkr(k.last30.revpar)} />
        <Kpi i={6} label="Rooms to clean · open repairs" value={`${k.today.pendingCleaning} · ${k.today.openTickets}`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Revenue, last 30 days">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={daily}>
                <CartesianGrid vertical={false} stroke="#F0EADB" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} width={44} />
                <Tooltip formatter={(v) => pkr(v)} />
                <Bar dataKey="revenue" fill="#C9A24D" radius={[4, 4, 0, 0]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Occupancy %, last 30 days">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={daily}>
                <CartesianGrid vertical={false} stroke="#F0EADB" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={34} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Area dataKey="occupancy" stroke="#141B2D" fill="#141B2D" fillOpacity={0.12} strokeWidth={2} animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className={`grid gap-6 ${['admin', 'manager'].includes(user.role) ? 'xl:grid-cols-[1.7fr_1fr]' : ''}`}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0"><RoomMap /></motion.div>
        {['admin', 'manager'].includes(user.role) && <ActivityFeed />}
      </div>
    </div>
  );
}
