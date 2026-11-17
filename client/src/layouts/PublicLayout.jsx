import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import Logo from '../components/common/Logo';
import { useAuthStore, HOME_BY_ROLE } from '../store/authStore';
import { useUi } from '../store/uiStore';
import { useT } from '../utils/i18n';
import UiSwitch from '../components/common/UiSwitch';
import Concierge from '../components/public/Concierge';
import IntroSplash from '../components/public/IntroSplash';

const NAV = [['/rooms', 'Rooms and suites'], ['/dining', 'Dining'], ['/wellness', 'Spa and wellness'], ['/offers', 'Offers'], ['/gallery', 'Gallery'], ['/about', 'About'], ['/contact', 'Contact']];

export default function PublicLayout() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const t = useT();
  const savedCount = useUi((st) => st.saved.length);

  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen">
      <header className={`sticky top-0 z-40 transition-all ${scrolled ? 'bg-navy/95 shadow-lg backdrop-blur' : 'bg-navy'} text-[#E9DDBF]`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Logo light />
          <nav aria-label="Main" className="hidden gap-5 text-sm xl:flex">
            {NAV.map(([to, text]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `relative whitespace-nowrap py-1 hover:text-white ${isActive ? 'text-white' : ''}`}>
                {({ isActive }) => (<>{t(text)}{isActive && <motion.span layoutId="nav-line" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold" />}</>)}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 xl:flex">
            <UiSwitch light />
            <Link to="/saved" className="h-10 whitespace-nowrap rounded-lg border border-navy-soft px-3 text-sm leading-10 hover:text-white" aria-label={`Saved rooms: ${savedCount}`}>♥ {savedCount}</Link>
            {user ? (
              <Link to={HOME_BY_ROLE[user.role]} className="rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-navy">{t('My dashboard')}</Link>
            ) : (
              <>
                <Link to="/login" className="rounded-lg border border-navy-soft px-4 py-3 text-sm hover:text-white">{t('Sign in')}</Link>
                <Link to="/rooms" className="rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-navy">{t('Book now')}</Link>
              </>
            )}
          </div>
          <button className="h-11 rounded-lg border border-navy-soft px-4 text-sm xl:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu">
            {open ? t('Close') : t('Menu')}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav id="mobile-menu" aria-label="Mobile" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-navy-soft xl:hidden">
              <div className="flex flex-col gap-1 px-6 py-4">
                {NAV.map(([to, text]) => <NavLink key={to} to={to} className="rounded-lg px-3 py-3 hover:bg-navy-soft">{t(text)}</NavLink>)}
                <NavLink to="/saved" className="rounded-lg px-3 py-3 hover:bg-navy-soft">♥ {t('Saved')} ({savedCount})</NavLink>
                <div className="py-2"><UiSwitch light /></div>
                <Link to={user ? HOME_BY_ROLE[user.role] : '/login'} className="mt-2 rounded-lg bg-gold px-3 py-3 text-center font-semibold text-navy">{user ? t('My dashboard') : t('Sign in')}</Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait">
        <motion.main key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <Concierge />
      <IntroSplash />
      <footer className="bg-[#0F1524] text-[#A9AFC2]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo light />
            <p className="mt-3 text-sm leading-relaxed">{t('Hospitality, quietly perfected. Three hotels across Pakistan, one standard of care.')}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-xs tracking-[0.2em] text-gold">{t('EXPLORE')}</p>
            {NAV.slice(0, 5).map(([to, text]) => <Link key={to} to={to} className="hover:text-white">{t(text)}</Link>)}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-xs tracking-[0.2em] text-gold">{t('GUESTS')}</p>
            <Link to="/guest" className="hover:text-white">{t('My stay')}</Link>
            <Link to="/faq" className="hover:text-white">{t('FAQs')}</Link>
            <Link to="/privacy" className="hover:text-white">{t('Privacy and your data')}</Link>
            <Link to="/contact" className="hover:text-white">{t('Contact us')}</Link>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-xs tracking-[0.2em] text-gold">{t('RESERVATIONS')}</p>
            <span>+92 21 111 589 789</span>
            <span>reservations@luxurystay.pk</span>
            <span>Open 24 hours, 7 days</span>
          </div>
        </div>
        <div className="border-t border-[#1B2440] py-5 text-center text-xs">© {new Date().getFullYear()} LuxuryStay Hospitality (Pvt) Ltd · Aptech eProject</div>
      </footer>
    </div>
  );
}
