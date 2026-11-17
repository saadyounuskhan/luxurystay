import { toneOf, label } from '../../utils/format';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

export function Badge({ status, children }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${toneOf(status)}`}>{children || label(status)}</span>;
}

export function Card({ title, action, children, className = '' }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className={`rounded-2xl border border-line bg-white/95 p-5 shadow-[0_1px_0_rgba(20,27,45,0.04),0_12px_32px_-18px_rgba(20,27,45,0.25)] md:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-display text-2xl font-semibold text-navy">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function PageHeader({ eyebrow, title, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-sm text-muted">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-semibold text-navy">{title}</h1>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// Counts up the number inside a text like "PKR 845K" or "72%"
export function CountUp({ value }) {
  const text = String(value ?? '');
  const m = text.match(/^(\D*?)([\d,]+(?:\.\d+)?)(.*)$/);
  const target = m ? Number(m[2].replace(/,/g, '')) : null;
  const decimals = m && m[2].includes('.') ? m[2].split('.')[1].length : 0;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (target === null) return;
    let raf; const start = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - start) / 1100); setN(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  if (target === null) return text;
  return `${m[1]}${n.toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${m[3]}`;
}

// KPI card with 3D tilt that follows the mouse
// Tiny trend line for KPI cards
function Sparkline({ data, accent }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), w = 120, h = 34;
  const pts = data.map((v, k) => `${(k / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * (h - 4) - 2}`).join(' ');
  const color = accent ? '#E2C27A' : '#C9A24D';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3 block h-8 w-full opacity-80" aria-hidden="true">
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity="0.12" stroke="none" />
      <motion.polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
    </svg>
  );
}

export function Kpi({ label: l, value, note, i = 0, accent = false, trend }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -10, y: ((e.clientX - r.left) / r.width - 0.5) * 10 });
  };
  return (
    <motion.div initial={{ opacity: 0, y: 20, rotateX: 20 }} animate={{ opacity: 1, y: 0, rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ delay: i * 0.07, type: 'spring', stiffness: 160, damping: 18 }} style={{ transformPerspective: 800 }}
      onMouseMove={onMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-xl ${accent ? 'border-navy bg-navy text-white' : 'border-line bg-white'}`}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gold/15 blur-2xl transition group-hover:bg-gold/30" />
      <p className={`text-sm ${accent ? 'text-[#C7CBD8]' : 'text-muted'}`}>{l}</p>
      <p className={`mt-2 font-display text-4xl font-semibold leading-none ${accent ? 'text-gold' : 'text-navy'}`}><CountUp value={value} /></p>
      {note && <p className={`mt-2 text-xs font-medium ${accent ? 'text-[#E9DDBF]' : 'text-[#2F6B3F]'}`}>{note}</p>}
      <Sparkline data={trend} accent={accent} />
    </motion.div>
  );
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-navy text-white hover:bg-navy-soft',
    gold: 'bg-gold text-navy font-semibold hover:brightness-95',
    outline: 'border border-navy text-navy bg-white hover:bg-ivory',
    ghost: 'text-navy hover:bg-ivory',
    danger: 'border border-[#8A2414] text-[#8A2414] bg-white hover:bg-[#F8E1DD]',
  };
  return <button className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:opacity-60 ${styles[variant]} ${className}`} {...props} />;
}

export function Field({ label: l, id, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">{l}</label>
      {children}
    </div>
  );
}

export const inputCls = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-gold';

export function Empty({ text = 'Nothing here yet' }) {
  return <p className="py-8 text-center text-sm text-muted">{text}</p>;
}

// Shimmer placeholder while data loads
export function Spinner() {
  return (
    <div className="flex flex-col gap-3 py-4" role="status">
      {[0, 1, 2].map((k) => (
        <div key={k} className="relative h-14 overflow-hidden rounded-xl bg-line/60">
          <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-navy">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-lg text-xl hover:bg-ivory">×</button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function Msg({ text, error }) {
  if (!text) return null;
  return <p role={error ? 'alert' : 'status'} className={`mt-3 rounded-lg px-3 py-2 text-sm ${error ? 'bg-[#F8E1DD] text-[#8A2414]' : 'bg-[#E4F1E6] text-[#1F5A2E]'}`}>{text}</p>;
}

export function Table({ head, children, minWidth = 640 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <thead>
          <tr className="text-left text-xs text-muted">{head.map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ children, className = '' }) => <td className={`border-t border-[#F0EADB] px-2 py-3 ${className}`}>{children}</td>;
