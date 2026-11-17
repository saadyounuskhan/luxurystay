import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, ContactShadows } from '@react-three/drei';

const COLOR = { available: '#5FA06E', occupied: '#4B63B8', reserved: '#D9A93F', maintenance: '#C4553F' };

function RoomBlock({ room, position, onPick, onHover }) {
  const ref = useRef();
  const [hover, setHover] = useState(false);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = hover ? 0.25 : 0;
    ref.current.position.z += (position[2] + target - ref.current.position.z) * Math.min(1, dt * 10);
  });
  return (
    <RoundedBox ref={ref} args={[0.9, 0.55, 0.9]} radius={0.06} position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); onHover(room); }}
      onPointerOut={() => { setHover(false); onHover(null); }}
      onClick={(e) => { e.stopPropagation(); onPick(room); }}>
      <meshStandardMaterial color={COLOR[room.status]} roughness={0.35} metalness={0.15}
        emissive={hover ? COLOR[room.status] : '#000000'} emissiveIntensity={hover ? 0.45 : 0} />
      {room.condition === 'dirty' && <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.92, 0.05, 0.92]} /><meshStandardMaterial color="#C9A24D" /></mesh>}
    </RoundedBox>
  );
}

// Each floor is a slab, each room a coloured block. Hover lifts it, click opens the room.
export default function Building3D({ rooms, onPick }) {
  const [hovered, setHovered] = useState(null);
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  const perRow = Math.max(...floors.map((f) => rooms.filter((r) => r.floor === f).length), 1);
  const width = perRow * 1.05;

  return (
    <div className="relative h-[460px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#1B2440] to-[#141B2D]">
      <Canvas camera={{ position: [width * 0.9, floors.length * 0.9 + 1.5, 7.5], fov: 40 }} dpr={[1, 1.75]} aria-label="3D view of hotel floors with room status">
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 6]} intensity={1.4} />
        <pointLight position={[-4, 3, 4]} intensity={20} color="#C9A24D" />
        <group position={[-width / 2 + 0.5, -floors.length * 0.4, 0]}>
          {floors.map((f, fi) => {
            const list = rooms.filter((r) => r.floor === f);
            return (
              <group key={f} position={[0, fi * 0.85, 0]}>
                <mesh position={[width / 2 - 0.5, -0.33, 0]}><boxGeometry args={[width + 0.3, 0.08, 1.4]} /><meshStandardMaterial color="#2A3350" metalness={0.5} roughness={0.4} /></mesh>
                <mesh position={[width / 2 - 0.5, -0.29, 0.71]}><boxGeometry args={[width + 0.3, 0.03, 0.02]} /><meshStandardMaterial color="#C9A24D" metalness={1} roughness={0.2} /></mesh>
                {list.map((r, i) => <RoomBlock key={r._id} room={r} position={[i * 1.05, 0, 0]} onPick={onPick} onHover={setHovered} />)}
              </group>
            );
          })}
        </group>
        <ContactShadows position={[0, -floors.length * 0.4 - 0.4, 0]} opacity={0.5} scale={14} blur={2.5} />
        <OrbitControls enablePan={false} minDistance={4} maxDistance={16} autoRotate={!hovered} autoRotateSpeed={0.6} />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-white/90 px-4 py-2 text-sm text-navy shadow" aria-live="polite">
        {hovered ? <><b>Room {hovered.number}</b> · floor {hovered.floor} · {hovered.status}{hovered.condition === 'dirty' ? ' · needs cleaning' : ''}</> : 'Hover a room · click to manage · drag to rotate'}
      </div>
      <p className="pointer-events-none absolute bottom-3 right-4 text-xs text-gold">Gold top = needs cleaning</p>
    </div>
  );
}
