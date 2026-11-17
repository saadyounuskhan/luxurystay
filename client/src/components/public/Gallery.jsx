import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { assetUrl } from '../../utils/media';

export default function Gallery({ images = [], alt }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  if (!images.length) return null;
  const go = (d) => setI((i + d + images.length) % images.length);

  return (
    <div>
      <div className="relative h-[420px] overflow-hidden rounded-2xl bg-ivory">
        <AnimatePresence mode="wait">
          <motion.img key={i} src={assetUrl(images[i].url)} alt={`${alt} photo ${i + 1}`} onClick={() => setZoom(true)}
            initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            className="h-full w-full cursor-zoom-in object-cover" />
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <button aria-label="Previous photo" onClick={() => go(-1)} className="absolute left-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/85 text-xl text-navy">‹</button>
            <button aria-label="Next photo" onClick={() => go(1)} className="absolute right-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/85 text-xl text-navy">›</button>
          </>
        )}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {images.map((img, k) => (
          <button key={img._id || img.url} onClick={() => setI(k)} aria-label={`Show photo ${k + 1}`}
            className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${k === i ? 'border-gold' : 'border-transparent opacity-70'}`}>
            <img src={assetUrl(img.url)} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6" onClick={() => setZoom(false)} role="dialog" aria-label="Photo">
          <img src={assetUrl(images[i].url)} alt={alt} className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
