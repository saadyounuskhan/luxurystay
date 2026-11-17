import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../store/authStore';
import Loader from '../components/common/Loader';

// <ProtectedRoute roles={['admin','manager']} /> — only those roles can open the page
export default function ProtectedRoute({ roles }) {
  const { user, ready } = useAuthStore();
  const location = useLocation();

  if (!ready) return <Loader full />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
