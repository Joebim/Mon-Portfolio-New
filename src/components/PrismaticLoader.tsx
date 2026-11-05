'use client';

import PrismaticBurst from './PrismaticBurst';

export interface PrismaticLoaderProps {
  fullScreen?: boolean;
}

export function PrismaticLoader({ fullScreen = true }: PrismaticLoaderProps) {
  return (
    <div
      className={
        fullScreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen bg-[#0B0B0B] overflow-hidden pointer-events-auto'
          : 'relative w-full h-[600px] overflow-hidden bg-[#0B0B0B]'
      }
      style={{
        width: fullScreen ? '100vw' : '100%',
        height: fullScreen ? '100vh' : '600px',
        position: fullScreen ? 'fixed' : 'relative',
        inset: 0,
        zIndex: fullScreen ? 9999 : 'auto',
      }}
    >
      <PrismaticBurst
        colors={["#A855F7", "#7C3AED", "#6366F1"]}
        animationType="rotate3d"
        intensity={2}
        speed={0.5}
        zoom={1}
        rayWidth={1}
        twist={0}
        mouseInteraction
        clickBurst
        intro
        rayCount={0}
        distort={0}
        flow={0}
        centerFade={1}
        glow={0}
        grain={0.8}
        mouseStrength={0.5}
        hoverDampness={0.25}
        fade={0}
        lightMode={false}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      />
    </div>
  );
}

export default PrismaticLoader;
