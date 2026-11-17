import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes/router';
import { authApi } from './api/auth.api';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { setAuth, setReady } = useAuthStore();

  // On page load: if refresh cookie exists, log the user back in automatically
  useEffect(() => {
    authApi
      .refresh()
      .then(({ user, accessToken }) => setAuth(user, accessToken))
      .catch(() => {})
      .finally(setReady);
  }, [setAuth, setReady]);

  return <RouterProvider router={router} />;
}
