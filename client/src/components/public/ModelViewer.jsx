import { useEffect, useState } from 'react';
import { assetUrl } from '../../utils/media';

// Google <model-viewer>: drag to rotate in 3D, and "View in your room" (AR) on phones.
// Android uses Scene Viewer / WebXR, iPhone uses Quick Look.
export default function ModelViewer({ src, alt, poster, height = 460 }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { import('@google/model-viewer').then(() => setReady(true)); }, []);
  if (!ready) return <div className="flex items-center justify-center rounded-2xl bg-[#1B2440] text-sm text-gold" style={{ height }}>Loading 3D room…</div>;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#F7F3EA] to-[#E8E0CC]" style={{ height }}>
      <model-viewer
        src={assetUrl(src)}
        alt={alt}
        poster={poster}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="auto"
        camera-controls
        touch-action="pan-y"
        auto-rotate
        auto-rotate-delay="1500"
        rotation-per-second="18deg"
        shadow-intensity="1"
        exposure="1.05"
        environment-image="neutral"
        camera-orbit="35deg 70deg auto"
        interaction-prompt="auto"
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <button slot="ar-button" className="absolute bottom-4 right-4 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-lg">
          View in your room (AR)
        </button>
      </model-viewer>
      <p className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs text-navy">Drag to rotate · scroll to zoom</p>
    </div>
  );
}
