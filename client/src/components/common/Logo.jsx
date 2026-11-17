import { Link } from 'react-router';

export default function Logo({ light = false }) {
  return (
    <Link to="/" className={`font-display text-3xl font-semibold ${light ? 'text-white' : 'text-navy'}`}>
      LuxuryStay
    </Link>
  );
}
