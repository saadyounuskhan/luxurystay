import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import Logo from '../components/common/Logo';
import NotificationBell from '../components/common/NotificationBell';
import CommandPalette from '../components/common/CommandPalette';
import Concierge from '../components/public/Concierge';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth.api';
import { useSocket } from '../hooks/useSocket';
import { useT } from '../utils/i18n';
import UiSwitch from '../components/common/UiSwitch';

const L = (to, text, group = 'Main') => ({ to, text, group });
const ACCOUNT = (base) => L(`${base}/account`, 'My account', 'Account');
export const MENU = {
  admin: [L('/staff', 'Dashboard'), L('/staff/front-desk', 'Front desk', 'Operations'), L('/staff/reservations', 'Reservations', 'Operations'), L('/staff/calendar', 'Calendar', 'Operations'), L('/staff/guests', 'Guests', 'Operations'), L('/staff/housekeeping', 'Housekeeping', 'Operations'), L('/staff/maintenance', 'Maintenance', 'Operations'), L('/staff/services', 'Service requests', 'Operations'), L('/staff/messages', 'Website messages', 'Operations'), L('/staff/invoices', 'Invoices', 'Finance'), L('/staff/reports', 'Reports and pricing', 'Finance'), L('/staff/night-audit', 'Night audit', 'Finance'), L('/staff/promos', 'Promo codes', 'Finance'), L('/staff/feedback', 'Feedback', 'Finance'), L('/staff/rooms', 'Rooms and 3D', 'Admin'), L('/staff/users', 'Staff and roles', 'Admin'), L('/staff/settings', 'Settings', 'Admin'), L('/staff/audit', 'Audit log', 'Admin'), ACCOUNT('/staff')],
  manager: [L('/staff', 'Dashboard'), L('/staff/reservations', 'Reservations', 'Operations'), L('/staff/calendar', 'Calendar', 'Operations'), L('/staff/housekeeping', 'Housekeeping', 'Operations'), L('/staff/maintenance', 'Maintenance', 'Operations'), L('/staff/invoices', 'Invoices', 'Finance'), L('/staff/reports', 'Reports and pricing', 'Finance'), L('/staff/night-audit', 'Night audit', 'Finance'), L('/staff/promos', 'Promo codes', 'Finance'), L('/staff/feedback', 'Feedback', 'Finance'), L('/staff/rooms', 'Rooms and 3D', 'Admin'), ACCOUNT('/staff')],
  receptionist: [L('/staff', 'Dashboard'), L('/staff/front-desk', 'Front desk', 'Operations'), L('/staff/reservations', 'Reservations', 'Operations'), L('/staff/calendar', 'Calendar', 'Operations'), L('/staff/guests', 'Guests', 'Operations'), L('/staff/services', 'Service requests', 'Operations'), L('/staff/maintenance', 'Maintenance', 'Operations'), L('/staff/messages', 'Website messages', 'Operations'), L('/staff/invoices', 'Invoices', 'Finance'), ACCOUNT('/staff')],
  housekeeping: [L('/staff', 'My tasks'), L('/staff/maintenance', 'Maintenance', 'Operations'), ACCOUNT('/staff')],
  guest: [L('/guest', 'My stay'), L('/guest/bookings', 'Bookings'), L('/guest/invoices', 'Invoices'), ACCOUNT('/guest')],
};

export default function DashboardLayout() {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  useSocket();
  const t = useT();
  const items = MENU[user.role];
  const groups = [...new Set(items.map((i) => i.group))];
  const current = [...items].sort((a, b) => b.to.length - a.to.length).find((i) => location.pathname.startsWith(i.to));

  const logout = async () => {
    try { await authApi.logout(); } finally { clear(); navigate('/login'); }
  };

  return (
    <div className="flex min-h-screen flex-wrap bg-[radial-gradient(ellipse_at_top_right,#EFE6D2_0%,#F7F3EA_45%)]">
      <aside className="relative flex w-full flex-col gap-6 overflow-hidden bg-gradient-to-b from-[#141B2D] via-[#18213A] to-[#0F1524] p-6 text-[#E9DDBF] md:sticky md:top-0 md:h-screen md:w-72 md:overflow-y-auto">
        <motion.span aria-hidden="true" className="pointer-events-none absolute -left-20 top-24 h-56 w-56 rounded-full bg-gold/20 blur-3xl"
          animate={{ y: [0, 40, 0], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 9, repeat: Infinity }} />
        <div className="relative">
          <Logo light />
          <p className="mt-1 text-[10px] tracking-[0.35em] text-gold">{user.role === 'admin' ? 'OWNER CONSOLE' : user.role.toUpperCase()}</p>
        </div>
        <button onClick={() => window.dispatchEvent(new Event('open-palette'))} className="relative hidden h-10 items-center justify-between rounded-lg border border-navy-soft bg-white/5 px-3 text-xs text-[#A9AFC2] hover:bg-white/10 md:flex">
          {t('Search pages')} <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
        </button>
        <nav aria-label="Dashboard" className="relative flex flex-row flex-wrap gap-1 md:flex-col">
          {groups.map((g) => (
            <div key={g} className="contents md:block">
              {groups.length > 1 && <p className="mt-3 hidden px-4 pb-1 text-[10px] tracking-[0.25em] text-[#6E7690] md:block">{t(g.toUpperCase())}</p>}
              {items.filter((m) => m.group === g).map((m) => (
                <NavLink key={m.to} to={m.to} end className="relative block">
                  {({ isActive }) => (
                    <span className={`relative z-10 block rounded-lg px-4 py-2.5 text-sm transition ${isActive ? 'font-semibold text-navy' : 'hover:bg-white/5 hover:pl-5'}`}>
                      {isActive && <motion.span layoutId="side-active" className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-gold to-[#E2C27A] shadow-[0_8px_24px_-8px_rgba(201,162,77,0.8)]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                      {t(m.text)}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
          {user.role === 'guest' && <Link to="/rooms" className="rounded-lg px-4 py-2.5 text-sm hover:bg-white/5">{t('Book a room')}</Link>}
        </nav>
        <div className="relative mt-auto flex items-center gap-3 rounded-xl border border-navy-soft bg-white/5 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark font-semibold text-navy">
            {user.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium text-white">{user.name}</p>
            <button onClick={logout} className="text-xs text-[#A9AFC2] hover:text-white">{t('Log out')}</button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10">
        <div className="no-print mb-6 flex items-center justify-between gap-3">
          <p className="text-xs tracking-[0.25em] text-muted">{t((current?.group || '').toUpperCase())} {current ? `· ${t(current.text)}` : ''}</p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <UiSwitch />
            <Link to="/" className="hidden h-11 items-center rounded-lg border border-line bg-white px-4 text-sm sm:inline-flex">{t('Website')}</Link>
            <NotificationBell />
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <CommandPalette items={items} />
      <Concierge mode={user.role === 'guest' ? 'guest' : 'staff'} />
    </div>
  );
}
