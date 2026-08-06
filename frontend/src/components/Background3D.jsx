import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Icosahedron, TorusKnot } from '@react-three/drei';
import { useTheme } from '../context/ThemeContext';

/** Slowly drifting distorted blob. */
function Blob({ position, scale, color, speed = 1, distort = 0.42 }) {
  const ref = useRef();
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.12 * speed;
    ref.current.rotation.x += delta * 0.05 * speed;
  });

  return (
    <Float speed={1.1 * speed} rotationIntensity={0.5} floatIntensity={1.5}>
      <Icosahedron ref={ref} args={[1, 12]} position={position} scale={scale}>
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={1.6}
          roughness={0.08}
          metalness={0.72}
          transparent
          opacity={0.82}
        />
      </Icosahedron>
    </Float>
  );
}

function Knot({ position, scale, color }) {
  const ref = useRef();
  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.16;
  });
  return (
    <Float speed={0.8} rotationIntensity={0.9} floatIntensity={2.2}>
      <TorusKnot ref={ref} args={[0.72, 0.22, 128, 24]} position={position} scale={scale}>
        <meshStandardMaterial color={color} roughness={0.14} metalness={0.9} transparent opacity={0.6} />
      </TorusKnot>
    </Float>
  );
}

function Scene({ isDark }) {
  const shapes = useMemo(
    () => [
      { Comp: Blob, position: [-4.2, 1.4, -3], scale: 1.55, color: '#7c4dff', speed: 1 },
      { Comp: Blob, position: [4.6, -1.1, -4], scale: 1.9, color: '#22d3ee', speed: 0.75, distort: 0.35 },
      { Comp: Blob, position: [2.4, 2.6, -6], scale: 1.1, color: '#d946ef', speed: 1.25 },
      { Comp: Knot, position: [-3.4, -2.3, -4.5], scale: 0.95, color: '#8b5cf6' },
      { Comp: Knot, position: [5.4, 2.4, -7], scale: 0.7, color: '#06b6d4' },
    ],
    []
  );

  return (
    <>
      <ambientLight intensity={isDark ? 0.45 : 0.95} />
      <directionalLight position={[6, 8, 5]} intensity={isDark ? 1.5 : 1.9} color="#c4b5fd" />
      <pointLight position={[-8, -4, -2]} intensity={isDark ? 26 : 16} color="#22d3ee" distance={22} />
      <pointLight position={[8, 5, 0]} intensity={isDark ? 22 : 14} color="#a855f7" distance={22} />
      {/* Rim light keeps the metal reading as metal without an HDR environment
          (which would need a network fetch). */}
      <spotLight position={[0, 10, 6]} angle={0.6} penumbra={1} intensity={isDark ? 40 : 24} color="#ffffff" />
      {shapes.map(({ Comp, ...p }, i) => (
        <Comp key={i} {...p} />
      ))}
    </>
  );
}

/**
 * Floating 3D shapes behind the whole app.
 * Skipped on small screens, on reduced-motion, and if WebGL is unavailable —
 * the CSS aurora in index.css remains as the graceful fallback.
 */
export default function Background3D() {
  const { isDark } = useTheme();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 767px)').matches;
    const deviceOk = (navigator.hardwareConcurrency || 4) >= 4;

    let webgl = false;
    try {
      const c = document.createElement('canvas');
      webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      webgl = false;
    }

    setEnabled(!reduced && !small && deviceOk && webgl);
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.55] transition-opacity duration-700 dark:opacity-70"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 9], fov: 52 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        frameloop="always"
      >
        <Suspense fallback={null}>
          <Scene isDark={isDark} />
        </Suspense>
      </Canvas>
    </div>
  );
}
