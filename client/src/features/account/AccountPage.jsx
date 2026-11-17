import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useGet, useAction, downloadFile } from '../../api/hooks';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { fmtDate, fmtTime, label } from '../../utils/format';
import { Card, Button, Field, inputCls, Msg, PageHeader, Badge } from '../../components/common/ui';

// "My account" for every role: details + password. Guests also get preferences and privacy.
export default function AccountPage() {
  const { data } = useGet(['me'], '/auth/me');
  const { user, setAuth, accessToken, clear } = useAuthStore();
  const navigate = useNavigate();
  const isGuest = user.role === 'guest';
  const [f, setF] = useState({ name: '', phone: '', bedType: '', diet: '', notes: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState({});
  const [pwMsg, setPwMsg] = useState({});

  useEffect(() => {
    if (data) setF({ name: data.user.name, phone: data.user.phone || '', bedType: data.profile?.preferences?.bedType || '', diet: data.profile?.preferences?.diet || '', notes: data.profile?.preferences?.notes || '' });
  }, [data]);

  const save = useAction(async () => {
    const r = await api.patch('/auth/me', { name: f.name, phone: f.phone });
    if (isGuest) await api.patch('/guests/me/profile', { preferences: { bedType: f.bedType, diet: f.diet, notes: f.notes } });
    return r;
  }, { invalidate: [['me']], onSuccess: (r) => { setAuth(r.data.user, accessToken); setMsg({ text: 'Details saved' }); }, onError: (e) => setMsg({ text: e, error: true }) });

  const changePw = useAction((b) => api.patch('/auth/password', b), {
    onSuccess: (r) => { setAuth(r.data.user, r.data.accessToken); setPw({ currentPassword: '', newPassword: '', confirm: '' }); setPwMsg({ text: 'Password changed' }); },
    onError: (e) => setPwMsg({ text: e, error: true }),
  });
  const { data: sessions = [] } = useGet(['sessions'], '/auth/sessions');
  const logoutAll = useAction(() => api.post('/auth/logout-all'), { onSuccess: () => { clear(); navigate('/login'); } });
  const del = useAction(() => api.delete('/guests/me'), { onSuccess: () => { clear(); navigate('/'); }, onError: (e) => setMsg({ text: e, error: true }) });

  const set = (e) => setF({ ...f, [e.target.name]: e.target.value });
  const setP = (e) => { setPw({ ...pw, [e.target.name]: e.target.value }); setPwMsg({}); };
  const submitPw = () => {
    if (pw.newPassword.length < 8 || !/\d/.test(pw.newPassword) || !/[A-Za-z]/.test(pw.newPassword)) return setPwMsg({ text: 'Use 8+ characters with letters and numbers', error: true });
    if (pw.newPassword !== pw.confirm) return setPwMsg({ text: 'New passwords do not match', error: true });
    changePw.mutate({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
  };
  const strength = [pw.newPassword.length >= 8, /\d/.test(pw.newPassword), /[A-Z]/.test(pw.newPassword), /[^A-Za-z0-9]/.test(pw.newPassword)].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Settings" title="My account" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-5 rounded-2xl bg-gradient-to-r from-navy to-navy-soft p-6 text-[#E9DDBF]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold font-display text-2xl font-semibold text-navy">{user.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</div>
        <div className="flex-1">
          <p className="font-display text-3xl text-white">{user.name}</p>
          <p className="text-sm">{user.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Badge status={user.role === 'admin' ? 'confirmed' : 'available'}>{user.role === 'admin' ? 'Owner · Admin' : label(user.role)}</Badge>
          {data?.user?.branch && <span>{data.user.branch.name}</span>}
          {data?.user?.lastLogin && <span className="text-xs text-[#A9AFC2]">Last login {fmtDate(data.user.lastLogin)}</span>}
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Personal details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" id="a-n"><input id="a-n" name="name" className={inputCls} value={f.name} onChange={set} autoComplete="name" /></Field>
            <Field label="Phone" id="a-p"><input id="a-p" name="phone" className={inputCls} value={f.phone} onChange={set} autoComplete="tel" /></Field>
            <div className="sm:col-span-2"><Field label="Email (login)" id="a-e"><input id="a-e" className={`${inputCls} bg-ivory`} value={user.email} readOnly /></Field></div>
            {isGuest && (
              <>
                <Field label="Preferred bed" id="a-b"><select id="a-b" name="bedType" className={inputCls} value={f.bedType} onChange={set}><option value="">No preference</option><option>King</option><option>Twin</option></select></Field>
                <Field label="Diet" id="a-d"><input id="a-d" name="diet" className={inputCls} value={f.diet} onChange={set} placeholder="Vegetarian, no nuts…" /></Field>
                <div className="sm:col-span-2"><Field label="Notes for the hotel" id="a-x"><input id="a-x" name="notes" className={inputCls} value={f.notes} onChange={set} /></Field></div>
              </>
            )}
          </div>
          <Msg text={msg.text} error={msg.error} />
          <Button className="mt-4" disabled={save.isPending} onClick={() => (f.name.trim().length < 2 ? setMsg({ text: 'Enter your name', error: true }) : save.mutate())}>Save details</Button>
        </Card>

        <Card title="Change password">
          <div className="flex flex-col gap-4">
            <Field label="Current password" id="pw-c"><input id="pw-c" name="currentPassword" type="password" autoComplete="current-password" className={inputCls} value={pw.currentPassword} onChange={setP} /></Field>
            <Field label="New password" id="pw-n"><input id="pw-n" name="newPassword" type="password" autoComplete="new-password" className={inputCls} value={pw.newPassword} onChange={setP} /></Field>
            <div className="flex gap-1" aria-label={`Password strength ${strength} of 4`}>{[0, 1, 2, 3].map((k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k < strength ? (strength > 2 ? 'bg-[#2F6B3F]' : 'bg-gold') : 'bg-line'}`} />)}</div>
            <Field label="Confirm new password" id="pw-r"><input id="pw-r" name="confirm" type="password" autoComplete="new-password" className={inputCls} value={pw.confirm} onChange={setP} /></Field>
          </div>
          <Msg text={pwMsg.text} error={pwMsg.error} />
          <Button className="mt-4" disabled={changePw.isPending} onClick={submitPw}>Update password</Button>
        </Card>
      </div>

      <Card title="Login history" action={<Button variant="danger" className="h-9" onClick={() => window.confirm('Log out from all phones and computers?') && logoutAll.mutate()}>Log out all devices</Button>}>
        {sessions.length === 0 ? <p className="text-sm text-muted">No logins recorded yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {sessions.map((s) => (
              <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0 flex-1 truncate">{/Mobile|Android|iPhone/i.test(s.userAgent) ? 'Phone' : 'Computer'} · {(s.userAgent || '').match(/(Edg|Chrome|Firefox|Safari)\/[\d.]+/)?.[0]?.split('/')[0].replace('Edg', 'Edge') || 'Browser'}</span>
                <span className="text-xs text-muted">{fmtTime(s.at)} · IP {s.ip}</span>
                <Badge status={s.success ? 'available' : 'cancelled'}>{s.success ? 'Success' : 'Failed'}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isGuest && (
        <Card title="Privacy and my data">
          <p className="text-sm text-[#4A4538]">Download everything we store about you, or delete your account. Invoices are kept for tax law but your name and contact details are removed.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => downloadFile('/guests/me/export', 'my-luxurystay-data.json')}>Download my data</Button>
            <Button variant="danger" onClick={() => window.confirm('Delete your account permanently?') && del.mutate()}>Delete my account</Button>
          </div>
        </Card>
      )}
      {user.role === 'admin' && (
        <Card title="Owner account">
          <p className="text-sm text-[#4A4538]">This is the only admin account. It cannot be deactivated, its role cannot be changed, and no other admin can be created. Keep your password safe and change it regularly.</p>
        </Card>
      )}
    </div>
  );
}
