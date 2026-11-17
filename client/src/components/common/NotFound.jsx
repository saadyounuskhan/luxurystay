import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-6xl text-navy">404</h1>
      <p className="text-muted">This page does not exist.</p>
      <Link to="/" className="rounded-lg bg-navy px-5 py-3 text-white">Go home</Link>
    </div>
  );
}
