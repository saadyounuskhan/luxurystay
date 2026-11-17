import { Link } from 'react-router';
import { useGet } from '../../api/hooks';
import { useUi } from '../../store/uiStore';
import PageHero from '../../components/public/PageHero';
import RoomCard from './RoomCard';

export default function SavedPage() {
  const saved = useUi((s) => s.saved);
  const { data: types = [] } = useGet(['roomTypes'], '/room-types');
  const list = types.filter((t) => saved.includes(t._id));
  return (
    <>
      <PageHero eyebrow="SAVED" title="Your favourite rooms" text="Tap the heart on any room to keep it here and compare later." />
      <section className="mx-auto max-w-7xl px-6 py-14">
        {list.length === 0 ? (
          <p className="text-center text-muted">No saved rooms yet. <Link to="/rooms" className="font-semibold text-gold-dark">Browse rooms</Link></p>
        ) : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{list.map((t, i) => <RoomCard key={t._id} type={t} i={i} />)}</div>}
      </section>
    </>
  );
}
