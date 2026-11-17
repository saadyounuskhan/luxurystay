import { useState } from 'react';
import { motion } from 'motion/react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import PageHero, { reveal } from '../../components/public/PageHero';
import { Field, inputCls, Msg, Button } from '../../components/common/ui';

export default function ContactPage() {
  const { data: branches = [] } = useGet(['branches'], '/branches');
  const empty = { name: '', email: '', phone: '', subject: 'Reservation', message: '', branch: '' };
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState({});
  const send = useAction((b) => api.post('/contact', b), { onSuccess: (r) => { setMsg({ text: r.message }); setF(empty); }, onError: (e) => setMsg({ text: e, error: true }) });
  const set = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setMsg({}); };
  const submit = (e) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setMsg({ text: 'Enter your name', error: true });
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setMsg({ text: 'Enter a valid email', error: true });
    if (f.message.trim().length < 10) return setMsg({ text: 'Message is too short', error: true });
    send.mutate({ ...f, branch: f.branch || undefined, phone: f.phone || undefined });
  };

  return (
    <>
      <PageHero eyebrow="CONTACT" title="We are here, day and night" text="Questions about a booking, events or something special? Write to us and we reply within 24 hours." />
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1.3fr_1fr]">
        <motion.form {...reveal} onSubmit={submit} noValidate className="rounded-2xl border border-line bg-white p-7">
          <h2 className="font-display text-3xl text-navy">Send a message</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Your name" id="c-n"><input id="c-n" name="name" className={inputCls} value={f.name} onChange={set} autoComplete="name" /></Field>
            <Field label="Email" id="c-e"><input id="c-e" name="email" type="email" className={inputCls} value={f.email} onChange={set} autoComplete="email" /></Field>
            <Field label="Phone (optional)" id="c-p"><input id="c-p" name="phone" className={inputCls} value={f.phone} onChange={set} autoComplete="tel" /></Field>
            <Field label="Hotel" id="c-b"><select id="c-b" name="branch" className={inputCls} value={f.branch} onChange={set}><option value="">Any</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.city}</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="Subject" id="c-s"><select id="c-s" name="subject" className={inputCls} value={f.subject} onChange={set}>{['Reservation', 'Events and weddings', 'Feedback', 'Billing', 'Other'].map((s) => <option key={s}>{s}</option>)}</select></Field></div>
            <div className="sm:col-span-2"><Field label="Message" id="c-m"><textarea id="c-m" name="message" rows={5} className={`${inputCls} h-auto py-2`} value={f.message} onChange={set} /></Field></div>
          </div>
          <Msg text={msg.text} error={msg.error} />
          <Button className="mt-5" disabled={send.isPending}>{send.isPending ? 'Sending…' : 'Send message'}</Button>
        </motion.form>
        <div className="flex flex-col gap-4">
          {branches.map((b, i) => (
            <motion.div key={b._id} {...reveal} transition={{ delay: i * 0.1, duration: 0.6 }} className="rounded-2xl bg-navy p-6 text-[#E9DDBF]">
              <h3 className="font-display text-2xl text-white">{b.name}</h3>
              <p className="mt-1 text-sm">{b.address}</p>
              <p className="mt-2 text-sm text-gold">{b.phone} · {b.email}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
