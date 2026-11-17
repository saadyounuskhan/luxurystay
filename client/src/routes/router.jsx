import { createBrowserRouter } from 'react-router';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import NotFound from '../components/common/NotFound';
import RouteError from '../components/common/RouteError';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import HomePage from '../features/public/HomePage';
import RoomsPage from '../features/public/RoomsPage';
import SearchPage from '../features/public/SearchPage';
import RoomPage from '../features/public/RoomPage';
import BookPage from '../features/public/BookPage';
import ConfirmationPage from '../features/public/ConfirmationPage';
import ContactPage from '../features/public/ContactPage';
import { DiningPage, WellnessPage, OffersPage, GalleryPage, AboutPage, FaqPage, PrivacyPage } from '../features/public/InfoPages';
import { PaymentSuccess, PaymentCancelled } from '../features/public/PaymentResult';
import GuestDashboard from '../features/guest/GuestDashboard';
import MyBookings from '../features/guest/MyBookings';
import AccountPage from '../features/account/AccountPage';
import InvoicesPage from '../features/billing/InvoicesPage';
import InvoiceView from '../features/billing/InvoiceView';
import StaffDashboard from '../features/staff/StaffDashboard';
import FrontDesk from '../features/staff/FrontDesk';
import ReservationsPage from '../features/staff/ReservationsPage';
import TapeChart from '../features/staff/TapeChart';
import HousekeepingPage from '../features/staff/HousekeepingPage';
import MaintenancePage from '../features/staff/MaintenancePage';
import ServicesPage from '../features/staff/ServicesPage';
import ReportsPage from '../features/staff/ReportsPage';
import FeedbackPage from '../features/staff/FeedbackPage';
import RoomsManagePage from '../features/staff/RoomsManagePage';
import MessagesPage from '../features/staff/MessagesPage';
import PromosPage from '../features/staff/PromosPage';
import NightAuditPage from '../features/staff/NightAuditPage';
import SavedPage from '../features/public/SavedPage';
import { StaffPage, SettingsPage, AuditPage, GuestsPage } from '../features/staff/AdminPages';

const ALL_STAFF = ['admin', 'manager', 'receptionist', 'housekeeping'];
const DESK = ['admin', 'manager', 'receptionist'];
const MGMT = ['admin', 'manager'];
const guard = (roles, children) => ({ element: <ProtectedRoute roles={roles} />, errorElement: <RouteError />, children });

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/rooms', element: <RoomsPage /> },
      { path: '/rooms/:id', element: <RoomPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/dining', element: <DiningPage /> },
      { path: '/wellness', element: <WellnessPage /> },
      { path: '/offers', element: <OffersPage /> },
      { path: '/gallery', element: <GalleryPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/faq', element: <FaqPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/saved', element: <SavedPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/book', element: <BookPage /> },
      guard(['guest'], [
        { path: '/booking/:id', element: <ConfirmationPage /> },
        { path: '/payment/success', element: <PaymentSuccess /> },
        { path: '/payment/cancelled', element: <PaymentCancelled /> },
      ]),
    ],
  },
  guard(['guest'], [{
    element: <DashboardLayout />,
    children: [
      { path: '/guest', element: <GuestDashboard /> },
      { path: '/guest/bookings', element: <MyBookings /> },
      { path: '/guest/invoices', element: <InvoicesPage /> },
      { path: '/guest/invoices/:id', element: <InvoiceView /> },
      { path: '/guest/account', element: <AccountPage /> },
    ],
  }]),
  guard(ALL_STAFF, [{
    element: <DashboardLayout />,
    children: [
      { path: '/staff', element: <StaffDashboard /> },
      { path: '/staff/account', element: <AccountPage /> },
      { path: '/staff/housekeeping', element: <HousekeepingPage /> },
      { path: '/staff/maintenance', element: <MaintenancePage /> },
      { path: '/staff/services', element: <ServicesPage /> },
      guard(DESK, [
        { path: '/staff/front-desk', element: <FrontDesk /> },
        { path: '/staff/reservations', element: <ReservationsPage /> },
        { path: '/staff/calendar', element: <TapeChart /> },
        { path: '/staff/guests', element: <GuestsPage /> },
        { path: '/staff/messages', element: <MessagesPage /> },
        { path: '/staff/invoices', element: <InvoicesPage /> },
        { path: '/staff/invoices/:id', element: <InvoiceView /> },
      ]),
      guard(MGMT, [
        { path: '/staff/reports', element: <ReportsPage /> },
        { path: '/staff/feedback', element: <FeedbackPage /> },
        { path: '/staff/rooms', element: <RoomsManagePage /> },
        { path: '/staff/promos', element: <PromosPage /> },
        { path: '/staff/night-audit', element: <NightAuditPage /> },
      ]),
      guard(['admin'], [
        { path: '/staff/users', element: <StaffPage /> },
        { path: '/staff/settings', element: <SettingsPage /> },
        { path: '/staff/audit', element: <AuditPage /> },
      ]),
    ],
  }]),
  { path: '*', element: <NotFound /> },
]);
