// All dates are stored as UTC midnight. Check-out day is NOT counted as a night.
export function toDay(value) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
export const today = () => toDay(new Date());
export const addDays = (d, n) => new Date(toDay(d).getTime() + n * 86400000);
export const nightsBetween = (a, b) => Math.round((toDay(b) - toDay(a)) / 86400000);
export const ymd = (d) => toDay(d).toISOString().slice(0, 10);
