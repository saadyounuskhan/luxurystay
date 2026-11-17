import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGet } from '../../api/hooks';
import { addDays } from '../../utils/format';
import { Field, inputCls } from '../../components/common/ui';

import { useT } from '../../utils/i18n';

export default function BookingBar({ initial = {}, compact = false }) {
  const t = useT();
  const { data: branches = [] } = useGet(['branches'], '/branches');
  const [form, setForm] = useState({ branch: initial.branch || '', checkIn: initial.checkIn || addDays(1), checkOut: initial.checkOut || addDays(3), adults: initial.adults || 2 });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const set = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };
  const branch = form.branch || branches[0]?._id || '';

  const submit = (e) => {
    e.preventDefault();
    if (!branch) return setError('Choose a hotel');
    if (form.checkOut <= form.checkIn) return setError('Check-out must be after check-in');
    navigate(`/search?${new URLSearchParams({ ...form, branch })}`);
  };

  return (
    <form onSubmit={submit} className={`grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-2 ${compact ? '' : 'lg:grid-cols-5 lg:items-end'}`}>
      <Field label={t('Hotel')} id="bb-branch">
        <select id="bb-branch" name="branch" value={branch} onChange={set} className={inputCls}>
          {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </Field>
      <Field label={t('Check-in')} id="bb-in"><input id="bb-in" type="date" name="checkIn" min={addDays(0)} value={form.checkIn} onChange={set} className={inputCls} /></Field>
      <Field label={t('Check-out')} id="bb-out"><input id="bb-out" type="date" name="checkOut" min={form.checkIn} value={form.checkOut} onChange={set} className={inputCls} /></Field>
      <Field label={t('Adults')} id="bb-ad">
        <select id="bb-ad" name="adults" value={form.adults} onChange={set} className={inputCls}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} adult{n > 1 ? 's' : ''}</option>)}
        </select>
      </Field>
      <button type="submit" className="h-11 rounded-lg bg-navy font-semibold text-white hover:bg-navy-soft">{t('Check availability')}</button>
      {error && <p role="alert" className="text-sm text-[#8A2414] sm:col-span-2 lg:col-span-5">{error}</p>}
    </form>
  );
}
