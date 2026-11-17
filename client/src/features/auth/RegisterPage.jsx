import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', acceptPrivacy: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Enter your full name');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (!form.acceptPrivacy) return setError('Please accept the privacy policy');
    setLoading(true);
    try {
      const { user, accessToken } = await authApi.register(form);
      setAuth(user, accessToken);
      navigate('/guest', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const field = 'mt-1 h-12 w-full rounded-lg border border-line px-4 outline-none focus:border-gold';

  return (
    <section className="flex min-h-[80vh] items-center justify-center px-6 py-16">
      <motion.form onSubmit={onSubmit} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-line bg-white p-8" noValidate>
        <h1 className="font-display text-4xl font-semibold text-navy">Create account</h1>
        <p className="mt-1 text-sm text-muted">Book faster and earn Gold rewards</p>

        <label htmlFor="name" className="mt-6 block text-sm font-medium">Full name</label>
        <input id="name" name="name" value={form.name} onChange={onChange} className={field} autoComplete="name" />

        <label htmlFor="email" className="mt-4 block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={onChange} className={field} autoComplete="email" />

        <label htmlFor="phone" className="mt-4 block text-sm font-medium">Phone (optional)</label>
        <input id="phone" name="phone" value={form.phone} onChange={onChange} className={field} autoComplete="tel" />

        <label htmlFor="password" className="mt-4 block text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={onChange} className={field} autoComplete="new-password" />

        <label className="mt-4 flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" name="acceptPrivacy" checked={form.acceptPrivacy} onChange={onChange} className="mt-1 h-4 w-4" />
          I agree to the privacy policy and allow LuxuryStay to store my booking data.
        </label>

        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={loading}
          className="mt-6 h-12 w-full rounded-lg bg-gold font-semibold text-navy disabled:opacity-70">
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <p className="mt-4 text-center text-sm text-muted">
          Already a member? <Link to="/login" className="font-medium text-gold-dark">Sign in</Link>
        </p>
      </motion.form>
    </section>
  );
}
