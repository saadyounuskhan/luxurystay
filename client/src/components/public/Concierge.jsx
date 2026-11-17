import { useState, useRef, useEffect, Fragment } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { api, errorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

// **bold** and new lines in AI answers
function Rich({ text }) {
  return String(text).split('\n').map((line, i) => (
    <Fragment key={i}>{i > 0 && <br />}{line.split(/(\*\*[^*]+\*\*)/g).map((p, k) => (p.startsWith('**') && p.endsWith('**') ? <strong key={k}>{p.slice(2, -2)}</strong> : p))}</Fragment>
  ));
}

const SUGGEST = {
  visitor: ['Room prices in Karachi', 'Is a deluxe room free this weekend?', 'Any promo code?'],
  guest: ['What is my bill balance?', 'My bookings', 'Late checkout kitne ka hai?'],
  staff: ["Today's overview", 'Who is arriving today?', 'Revenue last 7 days'],
};

// One chat for everyone. Gemini AI when the hotel has a key; built-in concierge otherwise.
export default function Concierge({ mode = 'visitor' }) {
  const user = useAuthStore((s) => s.user);
  const kind = mode === 'staff' ? 'staff' : user?.role === 'guest' ? 'guest' : 'visitor';
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState(false);
  const hello = kind === 'staff' ? `Hi ${user?.name?.split(' ')[0] || ''}! Ask me about today's rooms, arrivals, bookings or reports.` : 'Assalam o Alaikum! Ask me about rooms, prices, free dates, dining or offers — in English or Urdu.';
  const [msgs, setMsgs] = useState([{ from: 'bot', text: hello, suggestions: SUGGEST[kind] }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);
  useEffect(() => { api.get('/ai/status').then((r) => setAi(r.data.data.enabled)).catch(() => {}); }, []);

  const send = async (q) => {
    const question = (q ?? text).trim();
    if (!question || busy) return;
    setText('');
    const history = msgs.slice(1).map((m) => ({ role: m.from === 'me' ? 'user' : 'model', text: m.text }));
    setMsgs((m) => [...m, { from: 'me', text: question }]);
    setBusy(true);
    try {
      const { data } = await api.post('/ai/chat', { message: question, history });
      setMsgs((m) => [...m, { from: 'bot', text: data.data.answer, suggestions: data.data.suggestions, link: data.data.link }]);
    } catch (err) {
      setMsgs((m) => [...m, { from: 'bot', text: errorMessage(err) }]);
    } finally {
      setBusy(false);
    }
  };

  const title = kind === 'staff' ? 'Ask AI' : 'Concierge';
  return (
    <>
      <motion.button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Open ${title}`}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        className="no-print fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-[#C9A24D] to-[#E2C27A] px-5 font-semibold text-[#141B2D] shadow-[0_14px_34px_-10px_rgba(201,162,77,0.9)]">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute h-full w-full animate-ping rounded-full bg-[#141B2D]/40" /><span className="h-2.5 w-2.5 rounded-full bg-[#141B2D]" /></span>
        {open ? 'Close' : `${title}${ai ? ' · AI' : ''}`}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            className="no-print fixed bottom-24 right-5 z-40 flex h-[560px] max-h-[72vh] w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl" role="dialog" aria-label={title}>
            <div className="relative overflow-hidden bg-gradient-to-br from-[#141B2D] to-[#2A3350] px-5 py-4 text-white">
              <span aria-hidden="true" className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#C9A24D]/30 blur-2xl" />
              <p className="relative font-display text-2xl">{kind === 'staff' ? 'LuxuryStay AI' : 'Concierge'}</p>
              <p className="relative text-xs text-[#C9A24D]">{ai ? 'Powered by Gemini · uses live hotel data' : 'Answers from live hotel data · 24/7'}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${m.from === 'me' ? 'items-end' : 'items-start'}`}>
                  <p className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.from === 'me' ? 'rounded-br-sm bg-[#141B2D] text-white' : 'rounded-bl-sm bg-ivory text-ink'}`}><Rich text={m.text} /></p>
                  {m.link && <Link to={m.link} onClick={() => setOpen(false)} className="mt-1 text-xs font-semibold text-gold-dark">Open →</Link>}
                  {m.suggestions?.length > 0 && i === msgs.length - 1 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1 text-xs hover:border-gold">{s}</button>)}
                    </div>
                  )}
                </motion.div>
              ))}
              {busy && (
                <div className="flex gap-1 px-2" aria-label="Thinking">
                  {[0, 1, 2].map((d) => <motion.span key={d} className="h-2 w-2 rounded-full bg-[#C9A24D]" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }} />)}
                </div>
              )}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-line p-3">
              <label htmlFor={`cc-q-${kind}`} className="sr-only">Your question</label>
              <input id={`cc-q-${kind}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask anything…" maxLength={500} className="h-11 flex-1 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-gold" />
              <button className="h-11 rounded-xl bg-[#141B2D] px-4 text-sm font-semibold text-white" disabled={busy}>Send</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
