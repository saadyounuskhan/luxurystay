import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from './axios';
import { useGet } from './hooks';

// One button for guests: Stripe Checkout if the hotel set up Stripe, otherwise a demo card payment.
export function usePayNow({ onDone, onError } = {}) {
  const { data: config } = useGet(['payConfig'], '/payments/config', undefined, { staleTime: Infinity });
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const pay = async (reservationId, amount) => {
    setBusy(true);
    try {
      if (config?.stripe) {
        const { data } = await api.post('/payments/stripe/checkout', { reservation: reservationId });
        window.location.href = data.data.url; // goes to Stripe's secure page
        return;
      }
      await api.post('/payments', { reservation: reservationId, amount, method: 'card' });
      qc.invalidateQueries();
      onDone?.('Payment received. Thank you!');
    } catch (err) {
      onError?.(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return { pay, busy, stripe: !!config?.stripe };
}
