import { Link } from 'react-router';
import { motion } from 'motion/react';
import { pkr } from '../../utils/format';
import { coverOf, assetUrl } from '../../utils/media';
import RoomVisual from './RoomVisual';
import { useUi } from '../../store/uiStore';

// Card with 3D tilt on hover
export default function RoomCard({ type, i = 0 }) {
  const cover = coverOf(type);
  const { saved, toggleSaved } = useUi();
  const isSaved = saved.includes(type._id);
  return (
    <motion.article initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.08 }}
      whileHover={{ y: -8, rotateX: 3, rotateY: -3 }} style={{ transformPerspective: 900 }}
      className="group overflow-hidden rounded-3xl border border-line bg-white shadow-sm transition-shadow hover:shadow-[0_30px_60px_-25px_rgba(20,27,45,0.45)]">
      <div className="relative h-60 overflow-hidden">
        {cover ? <img src={cover} alt={type.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" /> : <RoomVisual slug={type.slug} />}
        {type.images?.[1] && <img src={assetUrl(type.images[1].url)} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 group-hover:scale-110 group-hover:opacity-100" />}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-navy">{type.branch?.city}</span>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {(type.panoramaUrl || type.model3dUrl) && <span className="rounded-full bg-[#141B2D]/90 px-3 py-1 text-xs font-medium text-[#C9A24D]">360° · 3D · AR</span>}
          <motion.button whileTap={{ scale: 1.4 }} onClick={() => toggleSaved(type._id)} aria-pressed={isSaved} aria-label={isSaved ? 'Remove from saved' : 'Save room'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-[#B23A48]">{isSaved ? '♥' : '♡'}</motion.button>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-2xl font-semibold text-navy">{type.name}</h3>
        <p className="mt-1 text-sm text-muted">{type.sizeSqm} m² · {type.bedType} bed · {type.capacity?.adults} adults</p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm"><span className="font-display text-2xl font-semibold text-navy">{pkr(type.basePrice)}</span> / night</p>
          <Link to={`/rooms/${type._id}`} className="rounded-lg border border-navy px-4 py-2 text-sm font-medium text-navy hover:bg-navy hover:text-white">View</Link>
        </div>
      </div>
    </motion.article>
  );
}
