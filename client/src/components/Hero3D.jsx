import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, ContactShadows, RoundedBox, Sparkles } from '@react-three/drei';

const ORANGE = '#ff7a1a';
const DARK = '#1c2530';
const METAL = '#aab4c0';
const TEAL = '#2dd4bf';
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* Click an object to give it a spin; hover to lift it. */
function Interactive({ children, position, rotation = [0, 0, 0], scale = 1 }) {
  const g = useRef();
  const spin = useRef(0);
  const [hover, setHover] = useState(false);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.rotation.y += spin.current * dt;
    spin.current *= 0.94;
    const s = scale * (hover ? 1.1 : 1);
    g.current.scale.setScalar(g.current.scale.x + (s - g.current.scale.x) * 0.15);
  });
  return (
    <group
      ref={g}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={(e) => (e.stopPropagation(), setHover(true), (document.body.style.cursor = 'pointer'))}
      onPointerOut={() => (setHover(false), (document.body.style.cursor = ''))}
      onClick={(e) => (e.stopPropagation(), (spin.current = 9))}
    >
      {children}
    </group>
  );
}

function Drill() {
  return (
    <group>
      <RoundedBox args={[1.5, 0.62, 0.6]} radius={0.14} smoothness={4}>
        <meshStandardMaterial color={ORANGE} roughness={0.4} metalness={0.15} />
      </RoundedBox>
      <RoundedBox args={[0.45, 1.0, 0.5]} radius={0.12} position={[-0.3, -0.72, 0]} rotation={[0, 0, 0.12]}>
        <meshStandardMaterial color={DARK} roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.85, 0.3, 0.6]} radius={0.08} position={[-0.42, -1.3, 0]}>
        <meshStandardMaterial color="#27323f" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.26, 0.4, 24]} />
        <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 12]} />
        <meshStandardMaterial color="#d7dde5" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.1, -0.38, 0.3]}>
        <boxGeometry args={[0.16, 0.2, 0.14]} />
        <meshStandardMaterial color="#0d1117" />
      </mesh>
    </group>
  );
}

function Toolbox() {
  return (
    <group>
      <RoundedBox args={[1.7, 0.75, 0.9]} radius={0.08} position={[0, -0.12, 0]}>
        <meshStandardMaterial color="#e5484d" roughness={0.45} metalness={0.2} />
      </RoundedBox>
      <RoundedBox args={[1.76, 0.22, 0.96]} radius={0.08} position={[0, 0.36, 0]}>
        <meshStandardMaterial color="#c93a3f" roughness={0.45} metalness={0.2} />
      </RoundedBox>
      <mesh position={[0, 0.47, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.42, 0.045, 12, 32, Math.PI]} />
        <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.22, 0.49]}>
          <boxGeometry args={[0.18, 0.2, 0.05]} />
          <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Drum() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 1.2, 32]} />
        <meshStandardMaterial color={TEAL} roughness={0.35} metalness={0.3} />
      </mesh>
      {[-0.4, 0, 0.4].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.505, 0.03, 8, 40]} />
          <meshStandardMaterial color="#0f766e" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0.18, 0.64, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.12, 16]} />
        <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function ReturnRing() {
  const ref = useRef();
  useFrame((_, dt) => ref.current && (ref.current.rotation.x += dt * 0.35, (ref.current.rotation.y += dt * 0.5)));
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[0.55, 0.09, 140, 14, 2, 3]} />
      <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.35} wireframe roughness={0.3} />
    </mesh>
  );
}

function Scene() {
  const rig = useRef();
  useFrame((state, dt) => {
    if (!rig.current) return;
    const { x, y } = state.pointer;
    rig.current.rotation.y += ((reduceMotion ? 0 : x * 0.45) - rig.current.rotation.y) * Math.min(1, dt * 3);
    rig.current.rotation.x += ((reduceMotion ? 0 : -y * 0.2) - rig.current.rotation.x) * Math.min(1, dt * 3);
  });
  const fl = reduceMotion ? 0 : 1;
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-5, 2, -3]} intensity={0.8} color="#7dd3fc" />
      <pointLight position={[0, -1, 3]} intensity={12} color={ORANGE} distance={9} />

      <group ref={rig}>
        <Float speed={1.6 * fl} rotationIntensity={0.5 * fl} floatIntensity={0.9 * fl}>
          <Interactive position={[-0.2, 0.55, 0]} rotation={[0.2, -0.6, 0.12]} scale={1.05}>
            <Drill />
          </Interactive>
        </Float>
        <Float speed={1.3 * fl} rotationIntensity={0.4 * fl} floatIntensity={0.7 * fl}>
          <Interactive position={[-1.9, -1.3, -0.4]} rotation={[0.1, 0.7, 0]} scale={0.8}>
            <Toolbox />
          </Interactive>
        </Float>
        <Float speed={1.9 * fl} rotationIntensity={0.4 * fl} floatIntensity={0.8 * fl}>
          <Interactive position={[1.9, -1.1, 0.2]} rotation={[0, 0.3, 0.08]} scale={0.85}>
            <Drum />
          </Interactive>
        </Float>
        <Float speed={2 * fl} floatIntensity={1.2 * fl}>
          <group position={[1.7, 1.55, -0.6]} scale={0.7}>
            <ReturnRing />
          </group>
        </Float>
      </group>

      {!reduceMotion && <Sparkles count={40} scale={[7, 4.5, 3]} size={2.4} speed={0.35} color={ORANGE} opacity={0.6} />}
      <ContactShadows position={[0, -2.1, 0]} opacity={0.5} scale={9} blur={2.6} far={3.5} color="#000" />
    </>
  );
}

export default function Hero3D() {
  return (
    <Canvas camera={{ position: [0, 0.3, 6.4], fov: 42 }} dpr={[1, 1.8]} frameloop={reduceMotion ? 'demand' : 'always'} gl={{ antialias: true, alpha: true }}>
      <Scene />
    </Canvas>
  );
}
