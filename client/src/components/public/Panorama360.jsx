import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { assetUrl } from '../../utils/media';
import SafeBox from '../common/SafeBox';

// Puts the 360° photo on the inside of a big ball. You stand in the middle and look around.
function Sphere({ url }) {
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return (
    <mesh scale={[-1, 1, 1]} rotation={[0, -Math.PI / 2, 0]}>
      <sphereGeometry args={[50, 64, 40]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

// Mouse wheel / pinch changes the field of view (zoom) instead of moving the camera
function FovZoom({ fov }) {
  const { camera } = useThree();
  useFrame(() => { camera.fov += (fov - camera.fov) * 0.15; camera.updateProjectionMatrix(); });
  return null;
}

export default function Panorama360({ src, height = 460 }) {
  const [fov, setFov] = useState(75);
  const [auto, setAuto] = useState(true);
  const [big, setBig] = useState(false);
  const box = useRef();
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e) => { e.preventDefault(); setFov((f) => Math.min(90, Math.max(35, f + e.deltaY * 0.03))); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={box} className={`relative overflow-hidden rounded-2xl bg-[#1B2440] ${big ? 'fixed inset-3 z-50' : ''}`} style={big ? undefined : { height }}>
      <SafeBox fallback={<p className="p-10 text-center text-sm text-gold">360° view is not supported on this device.</p>}>
        <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }} dpr={[1, 1.75]} aria-label="360 degree view of the room" onPointerDown={() => setAuto(false)}>
          <Suspense fallback={null}><Sphere url={assetUrl(src)} /></Suspense>
          <FovZoom fov={fov} />
          <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={-0.35} autoRotate={auto} autoRotateSpeed={0.4} />
        </Canvas>
      </SafeBox>
      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-[rgba(255,255,255,0.88)] px-3 py-1 text-xs font-medium text-[#141B2D]">360° · drag to look around · scroll to zoom</span>
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button onClick={() => setAuto(!auto)} className="h-10 rounded-full bg-[rgba(255,255,255,0.92)] px-4 text-xs font-semibold text-[#141B2D]">{auto ? 'Pause' : 'Auto-rotate'}</button>
        <button onClick={() => setBig(!big)} className="h-10 rounded-full bg-[#141B2D] px-4 text-xs font-semibold text-white">{big ? 'Close' : 'Expand'}</button>
      </div>
    </div>
  );
}
