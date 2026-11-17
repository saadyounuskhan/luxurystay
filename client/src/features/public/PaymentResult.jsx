import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../../api/axios';
import { Spinner } from '../../components/common/ui';

// Stripe sends the guest back here after paying
export function PaymentSuccess() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true });
  const qc = useQueryClient();
  useEffect(() => {
    api.get('/payments/stripe/verify', { params: { session_id: params.get('session_id') } })
      .then((r) => { setState({ ...r.data.data }); qc.invalidateQueries(); })
      .catch((e) => setState({ paid: false, reason: errorMessage(e) }));
  }, [params, qc]);
  if (state.loading) return <Spinner />;
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }}
        className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl ${state.paid ? 'bg-gold text-navy' : 'bg-[#F8E1DD] text-[#8A2414]'}`} aria-hidden="true">{state.paid ? '✓' : '!'}</motion.div>
      <h1 className="mt-6 font-display text-5xl text-navy">{state.paid ? 'Payment successful' : 'Payment not completed'}</h1>
      <p className="mt-2 text-muted">{state.paid ? 'Thank you! Your bill has been updated.' : state.reason}</p>
      <Link to="/guest" className="mt-8 inline-block rounded-lg bg-navy px-6 py-3 text-white">Back to my stay</Link>
    </div>
  );
}

export function PaymentCancelled() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="font-display text-5xl text-navy">Payment cancelled</h1>
      <p className="mt-2 text-muted">No money was taken. You can pay any time from your dashboard.</p>
      <Link to="/guest" className="mt-8 inline-block rounded-lg bg-navy px-6 py-3 text-white">Back to my stay</Link>
    </div>
  );
}
