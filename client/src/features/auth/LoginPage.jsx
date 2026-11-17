import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/axios';
import { useAuthStore, HOME_BY_ROLE } from '../../store/authStore';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation();

  const onChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError('Enter email and password');
    setLoading(true);
    try {
      const { user, accessToken } = await authApi.login(form);
      setAuth(user, accessToken);
      navigate(location.state?.from || HOME_BY_ROLE[user.role], { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-[80vh] items-center justify-center px-6 py-16">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl border border-line bg-white p-8"
        noValidate
      >
        <h1 className="font-display text-4xl font-semibold text-navy">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to your LuxuryStay account</p>

        <label htmlFor="email" className="mt-6 block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange}
          className="mt-1 h-12 w-full rounded-lg border border-line px-4 outline-none focus:border-gold" placeholder="you@example.com" />

        <label htmlFor="password" className="mt-4 block text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={onChange}
          className="mt-1 h-12 w-full rounded-lg border border-line px-4 outline-none focus:border-gold" />

        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={loading}
          className="mt-6 h-12 w-full rounded-lg bg-navy font-semibold text-white hover:bg-navy-soft disabled:opacity-70">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-4 text-center text-sm text-muted">
          New here? <Link to="/register" className="font-medium text-gold-dark">Create an account</Link>
        </p>

      </motion.form>
    </section>
  );
}
