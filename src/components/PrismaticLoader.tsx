'use client';

import dynamic from 'next/dynamic';

const PrismaticBurst = dynamic(() => import('./PrismaticBurst'), {
  ssr: false,
});

export interface PrismaticLoaderProps {
  label?: string;
  sublabel?: string;
  colors?: string[];
  fullScreen?: boolean;
}

export function PrismaticLoader({
  label = 'INITIALIZING SYSTEM',
  sublabel = 'Connecting to workspace and fetching latest data...',
  colors = ['#A855F7', '#7C3AED', '#6366F1'],
  fullScreen = true,
}: PrismaticLoaderProps) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-[#0B0B0B] flex flex-col items-center justify-center select-none ${
        fullScreen ? 'fixed inset-0 z-50 min-h-screen' : 'h-[600px]'
      }`}
    >
      {/* Background Interactive PrismaticBurst Canvas */}
      <div className="absolute inset-0 w-full h-full pointer-events-auto">
        <PrismaticBurst
          colors={colors}
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
        />
      </div>

      {/* Floating Center Overlay Badge */}
      <div className="relative z-10 pointer-events-none flex flex-col items-center text-center px-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-[#A855F7] animate-ping" />
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#d8b4fe] font-semibold">
            {label}
          </span>
        </div>

        <div className="w-12 h-[1px] bg-white/10 my-2" />

        <p className="font-mono text-[10px] text-[#8e8883] tracking-[0.08em] uppercase max-w-xs">
          {sublabel}
        </p>
      </div>
    </div>
  );
}

export default PrismaticLoader;
