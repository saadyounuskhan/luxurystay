export const pkr = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
export const shortPkr = (n) => (n >= 1e6 ? `PKR ${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `PKR ${Math.round(n / 1e3)}K` : pkr(n));
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
export const fmtDay = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const fmtTime = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const label = (s = '') => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const ymd = (d) => new Date(d).toISOString().slice(0, 10);
export const addDays = (n) => ymd(new Date(Date.now() + n * 86400000));

// Colour for every status in the app (always shown with text, not colour alone)
const TONES = {
  green: 'bg-[#E4F1E6] text-[#1F5A2E]',
  blue: 'bg-[#E3E8F5] text-[#1E2F63]',
  amber: 'bg-[#FBEFD6] text-[#7A4F00]',
  red: 'bg-[#F8E1DD] text-[#8A2414]',
  grey: 'bg-[#EFEBE2] text-[#4A4538]',
};
const MAP = {
  available: 'green', clean: 'green', inspected: 'green', confirmed: 'blue', checked_in: 'green', checked_out: 'grey',
  done: 'green', resolved: 'green', closed: 'grey', succeeded: 'green', paid: 'green',
  occupied: 'blue', reserved: 'amber', in_progress: 'amber', accepted: 'blue', requested: 'amber', pending: 'amber', open: 'amber',
  dirty: 'amber', maintenance: 'red', cancelled: 'red', no_show: 'red', urgent: 'red', high: 'red', medium: 'amber', low: 'grey', normal: 'grey',
};
export const toneOf = (status) => TONES[MAP[status] || 'grey'];
