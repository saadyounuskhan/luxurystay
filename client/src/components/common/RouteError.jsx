import { Link, useRouteError } from 'react-router';

export default function RouteError() {
  const error = useRouteError();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-5xl text-navy">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted">{error?.message || 'Please refresh the page.'}</p>
      <Link to="/" className="rounded-lg bg-navy px-5 py-3 text-white">Go home</Link>
    </div>
  );
}
