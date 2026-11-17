import { useState, useEffect } from 'react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { label, fmtTime, pkr } from '../../utils/format';
import { Card, Button, Spinner, PageHeader, Badge, Empty, Table, Td, Modal, Field, inputCls, Msg } from '../../components/common/ui';

// ===================== Staff =====================
// Rules: only ONE admin (the owner). Admin cannot be edited, deactivated or created here.
const STAFF_ROLES = ['manager', 'receptionist', 'housekeeping'];
export function StaffPage() {
  const { data = [], isLoading } = useGet(['users'], '/users');
  const { data: branches = [] } = useGet(['branches'], '/branches');
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState({});
  const toggle = useAction((u) => api.patch(`/users/${u._id}`, { isActive: !u.isActive }), { invalidate: [['users']], onSuccess: (r) => setMsg({ text: r.message }), onError: (e) => setMsg({ text: e, error: true }) });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Admin" title="Staff and roles"><Button variant="gold" onClick={() => setEdit({})}>Add staff</Button></PageHeader>
      <Msg text={msg.text} error={msg.error} />
      <Card>
        {isLoading ? <Spinner /> : (
          <Table head={['Name', 'Email', 'Role', 'Hotel', 'Status', '']}>
            {data.map((u) => (
              <tr key={u._id}>
                <Td className="font-medium">{u.name}</Td><Td>{u.email}</Td>
                <Td>{u.role === 'admin' ? <Badge status="confirmed">Owner · Admin</Badge> : <span className="capitalize">{u.role}</span>}</Td>
                <Td>{u.branch?.city || 'All'}</Td>
                <Td><Badge status={u.isActive ? 'available' : 'cancelled'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge></Td>
                <Td className="whitespace-nowrap text-right">
                  {u.role === 'admin' ? <span className="text-xs text-muted">Protected</span> : (
                    <>
                      <Button variant="ghost" className="h-9" onClick={() => setEdit(u)}>Edit</Button>
                      <Button variant="outline" className="h-9" onClick={() => toggle.mutate(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</Button>
                    </>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Who can do what">
        <Table head={['Feature', 'Admin', 'Manager', 'Reception', 'Housekeeping']} minWidth={560}>
          {[
            ['Bookings, check-in/out, bills', '✓', '✓', '✓', '—'], ['Invoices (view, print, download)', '✓', '✓', '✓', '—'],
            ['Rooms, photos, 3D, prices', '✓ all hotels', '✓ own hotel', '—', '—'], ['Reports, forecast, pricing', '✓', '✓', '—', '—'],
            ['Cleaning tasks, maintenance', '✓', '✓', '✓', '✓'], ['Staff accounts, settings, audit log', '✓', '—', '—', '—'],
          ].map((row) => <tr key={row[0]}>{row.map((c, k) => <Td key={k} className={k ? 'text-center' : 'font-medium'}>{c}</Td>)}</tr>)}
        </Table>
      </Card>
      <StaffModal user={edit} branches={branches} onClose={() => setEdit(null)} onDone={(t) => { setEdit(null); setMsg({ text: t }); }} />
    </div>
  );
}

function StaffModal({ user, branches, onClose, onDone }) {
  const isNew = user && !user._id;
  const [f, setF] = useState({});
  const [err, setErr] = useState('');
  const cur = { name: '', email: '', phone: '', password: '', role: 'receptionist', branch: '', ...(user?._id ? { ...user, branch: user.branch?._id || '', password: '' } : {}), ...f };
  const save = useAction((b) => (isNew ? api.post('/users', b) : api.patch(`/users/${user._id}`, b)), { invalidate: [['users']], onSuccess: (r) => { setF({}); onDone(r.message); }, onError: setErr });
  const set = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setErr(''); };
  const submit = () => {
    if (!cur.name || (isNew && !cur.email)) return setErr('Name and email are required');
    if ((isNew || cur.password) && cur.password.length < 8) return setErr('Password must be at least 8 characters');
    const body = { name: cur.name, phone: cur.phone, role: cur.role, branch: cur.branch || null };
    if (isNew) Object.assign(body, { email: cur.email, branch: cur.branch || undefined });
    if (cur.password) body.password = cur.password;
    save.mutate(body);
  };
  return (
    <Modal open={!!user} title={isNew ? 'Add staff member' : `Edit ${user?.name || ''}`} onClose={() => { setF({}); onClose(); }}>
      <div className="flex flex-col gap-3">
        <Field label="Name" id="s-n"><input id="s-n" name="name" className={inputCls} value={cur.name} onChange={set} /></Field>
        <Field label="Email" id="s-e"><input id="s-e" name="email" type="email" className={`${inputCls} ${isNew ? '' : 'bg-ivory'}`} value={cur.email} onChange={set} readOnly={!isNew} /></Field>
        <Field label="Phone" id="s-ph"><input id="s-ph" name="phone" className={inputCls} value={cur.phone || ''} onChange={set} /></Field>
        <Field label={isNew ? 'Password' : 'New password (leave empty to keep)'} id="s-p"><input id="s-p" name="password" type="password" autoComplete="new-password" className={inputCls} value={cur.password} onChange={set} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role" id="s-r"><select id="s-r" name="role" className={inputCls} value={cur.role} onChange={set}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}</select></Field>
          <Field label="Hotel" id="s-b"><select id="s-b" name="branch" className={inputCls} value={cur.branch} onChange={set}><option value="">All</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.city}</option>)}</select></Field>
        </div>
        <p className="text-xs text-muted">The admin role cannot be given to anyone. There is only one admin.</p>
        <Msg text={err} error />
        <Button disabled={save.isPending} onClick={submit}>{isNew ? 'Create account' : 'Save changes'}</Button>
      </div>
    </Modal>
  );
}

// ===================== Settings =====================
export function SettingsPage() {
  const { data } = useGet(['settings'], '/settings');
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { if (data) setF({ ...(data.company || {}), taxRate: data.taxRate, freeHours: data.cancellationPolicy?.freeHours, feePercent: data.cancellationPolicy?.feePercent, weekend: data.pricingRules?.weekendMultiplier, points: data.loyalty?.pointsPerPKR }); }, [data]);
  const save = useAction(() => api.patch('/settings', {
    company: { name: f.name, ntn: f.ntn, email: f.email, phone: f.phone, website: f.website, address: f.address },
    taxRate: Number(f.taxRate), cancellationPolicy: { freeHours: Number(f.freeHours), feePercent: Number(f.feePercent) },
    pricingRules: { ...data.pricingRules, weekendMultiplier: Number(f.weekend) }, loyalty: { pointsPerPKR: Number(f.points) },
  }), { invalidate: [['settings']], onSuccess: () => setMsg('Settings saved') });
  if (!f) return <Spinner />;
  const set = (e) => setF({ ...f, [e.target.name]: e.target.value });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Admin" title="System settings" />
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tax rate (%)" id="st-t"><input id="st-t" name="taxRate" type="number" className={inputCls} value={f.taxRate} onChange={set} /></Field>
          <Field label="Weekend price multiplier" id="st-w"><input id="st-w" name="weekend" type="number" step="0.05" className={inputCls} value={f.weekend} onChange={set} /></Field>
          <Field label="Free cancellation (hours before check-in)" id="st-f"><input id="st-f" name="freeHours" type="number" className={inputCls} value={f.freeHours} onChange={set} /></Field>
          <Field label="Late cancellation fee (%)" id="st-c"><input id="st-c" name="feePercent" type="number" className={inputCls} value={f.feePercent} onChange={set} /></Field>
          <Field label="Loyalty points per PKR" id="st-p"><input id="st-p" name="points" type="number" step="0.01" className={inputCls} value={f.points} onChange={set} /></Field>
        </div>
        <h3 className="mt-6 font-display text-2xl text-navy">Invoice details</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {[['name', 'Company name'], ['ntn', 'NTN (tax number)'], ['email', 'Billing email'], ['phone', 'Phone'], ['website', 'Website'], ['address', 'Head office address']].map(([k, l]) => (
            <Field key={k} label={l} id={`co-${k}`}><input id={`co-${k}`} name={k} className={inputCls} value={f[k] || ''} onChange={set} /></Field>
          ))}
        </div>
        <Msg text={msg} />
        <Button className="mt-4" onClick={() => save.mutate()}>Save settings</Button>
      </Card>
    </div>
  );
}

// ===================== Audit log =====================
export function AuditPage() {
  const { data = [], isLoading } = useGet(['audit'], '/audit-logs');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Security" title="Audit log" />
      <Card>
        {isLoading ? <Spinner /> : data.length === 0 ? <Empty /> : (
          <Table head={['When', 'Who', 'Action', 'What', 'Details']} minWidth={760}>
            {data.map((a) => (
              <tr key={a._id}>
                <Td className="text-xs">{fmtTime(a.at)}</Td>
                <Td>{a.user?.name || '—'} <span className="text-xs capitalize text-muted">{a.user?.role}</span></Td>
                <Td><Badge status={a.action === 'delete' ? 'cancelled' : a.action === 'create' ? 'available' : 'pending'}>{a.action}</Badge></Td>
                <Td>{a.entity}</Td>
                <Td className="max-w-xs truncate text-xs text-muted">{a.after ? JSON.stringify(a.after).slice(0, 80) : ''}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

// ===================== Guests =====================
export function GuestsPage() {
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useGet(['guests'], '/guests', { q: q || undefined });
  const [sel, setSel] = useState(null);
  const { data: detail } = useGet(['guest', sel], `/guests/${sel}`, undefined, { enabled: !!sel });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="CRM" title="Guests" />
      <Card>
        <label className="sr-only" htmlFor="g-q">Search</label>
        <input id="g-q" className={`${inputCls} mb-4 max-w-sm`} placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        {isLoading ? <Spinner /> : (
          <Table head={['Name', 'Email', 'Phone', '']} minWidth={520}>
            {data.map((g) => (
              <tr key={g._id}><Td className="font-medium">{g.name}</Td><Td>{g.email}</Td><Td>{g.phone || '—'}</Td>
                <Td className="text-right"><Button variant="outline" className="h-9" onClick={() => setSel(g._id)}>Profile</Button></Td></tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!sel} title={detail?.user?.name || 'Guest'} onClose={() => setSel(null)}>
        {!detail ? <Spinner /> : (
          <div className="text-sm">
            <p>{detail.user.email} · {detail.user.phone || 'no phone'}</p>
            <p className="mt-1 capitalize">{detail.profile?.loyalty?.tier} · {detail.profile?.loyalty?.points} points</p>
            <h3 className="mt-4 font-semibold">Stays ({detail.stays.length})</h3>
            {detail.stays.slice(0, 8).map((s) => <p key={s._id} className="flex justify-between border-b border-[#F0EADB] py-1.5"><span>{s.code} · {s.roomType?.name}</span><span>{pkr(s.totalAmount)}</span></p>)}
          </div>
        )}
      </Modal>
    </div>
  );
}
