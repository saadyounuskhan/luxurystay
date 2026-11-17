import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';

// Press Ctrl+K (or ⌘K) anywhere in the dashboard to jump to any page
export default function CommandPalette({ items }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); setQ(''); setActive(0); }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => { setOpen(true); setQ(''); setActive(0); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-palette', onOpen); };
  }, []);

  const list = items.filter((i) => i.text.toLowerCase().includes(q.toLowerCase()));
  const go = (item) => { setOpen(false); navigate(item.to); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-start justify-center bg-navy/50 p-4 pt-[15vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <motion.div initial={{ y: -20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -10, opacity: 0 }} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Go to page">
            <input autoFocus value={q} placeholder="Go to… (type a page name)" aria-label="Search pages"
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === 'Enter' && list[active]) go(list[active]);
              }}
              className="h-14 w-full border-b border-line px-5 text-base outline-none" />
            <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
              {list.length === 0 && <li className="p-4 text-sm text-muted">No page found</li>}
              {list.map((item, k) => (
                <li key={item.to} role="option" aria-selected={k === active}>
                  <button onMouseEnter={() => setActive(k)} onClick={() => go(item)}
                    className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm ${k === active ? 'bg-navy text-white' : 'text-ink'}`}>
                    {item.text}<span className={`text-xs ${k === active ? 'text-gold' : 'text-muted'}`}>{item.to}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
