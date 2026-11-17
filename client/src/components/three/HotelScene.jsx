import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, ContactShadows } from '@react-three/drei';

// A stylised luxury tower made in code (no model file needed). Windows glow gold at random.
function Tower() {
  const group = useRef();
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.15; });

  const windows = useMemo(() => {
    const list = [];
    for (let floor = 0; floor < 12; floor++) {
      for (let side = 0; side < 4; side++) {
        for (let col = 0; col < 3; col++) {
          const lit = Math.random() > 0.45;
          const x = (col - 1) * 0.42;
          const y = 0.35 + floor * 0.36;
          const pos = [[x, y, 0.71], [0.71, y, x], [x, y, -0.71], [-0.71, y, x]][side];
          const rot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][side];
          list.push({ pos, rot, lit, key: `${floor}-${side}-${col}` });
        }
      }
    }
    return list;
  }, []);

  return (
    <group ref={group} position={[0, -2.4, 0]}>
      <mesh position={[0, 0.1, 0]}><boxGeometry args={[2.6, 0.2, 2.6]} /><meshStandardMaterial color="#1B2440" metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[0, 2.35, 0]}><boxGeometry args={[1.4, 4.4, 1.4]} /><meshStandardMaterial color="#141B2D" metalness={0.6} roughness={0.25} /></mesh>
      <mesh position={[0, 4.7, 0]}><boxGeometry args={[1.0, 0.3, 1.0]} /><meshStandardMaterial color="#C9A24D" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[0, 5.15, 0]}><coneGeometry args={[0.08, 0.6, 8]} /><meshStandardMaterial color="#C9A24D" metalness={1} roughness={0.15} /></mesh>
      {windows.map((w) => (
        <mesh key={w.key} position={w.pos} rotation={[0, w.rot, 0]}>
          <planeGeometry args={[0.28, 0.2]} />
          <meshStandardMaterial color={w.lit ? '#F3D58A' : '#2A3350'} emissive={w.lit ? '#C9A24D' : '#000000'} emissiveIntensity={w.lit ? 1.4 : 0} />
        </mesh>
      ))}
    </group>
  );
}

export default function HotelScene() {
  return (
    <Canvas camera={{ position: [4.5, 2.2, 5.5], fov: 42 }} dpr={[1, 1.75]} aria-label="3D model of the LuxuryStay hotel">
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.4} color="#FFF4DD" />
      <pointLight position={[-4, 2, -3]} intensity={30} color="#C9A24D" />
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.4}>
        <Tower />
      </Float>
      <ContactShadows position={[0, -2.45, 0]} opacity={0.5} scale={10} blur={2.5} far={4} color="#000000" />
      <hemisphereLight args={['#FFF4DD', '#141B2D', 0.8]} />
      <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 2.1} />
    </Canvas>
  );
}
