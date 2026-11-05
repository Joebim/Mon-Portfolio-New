'use client';

import { useState, useEffect } from 'react';
import PrismaticBurst from './PrismaticBurst';

export const PORTFOLIO_BURST_COLORS = [
  '#f36d45', // Ember (signature brand primary)
  '#ff8c5a', // Warm flame glow
  '#ffb490', // Ember soft (peach highlight)
  '#c2410c', // Deep copper/amber depth
];

export interface PrismaticLoaderProps {
  fullScreen?: boolean;
  autoFadeOut?: boolean;
  minDuration?: number;
  fadeDuration?: number;
  isFadingOut?: boolean;
  onFadeComplete?: () => void;
  colors?: string[];
  style?: React.CSSProperties;
}

export function PrismaticLoader({
  fullScreen = true,
  autoFadeOut = false,
  minDuration = 1000,
  fadeDuration = 700,
  isFadingOut: manualFading,
  onFadeComplete,
  colors = PORTFOLIO_BURST_COLORS,
  style,
}: PrismaticLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [internalFading, setInternalFading] = useState(false);

  useEffect(() => {
    if (!autoFadeOut) return;

    const timer = setTimeout(() => {
      setInternalFading(true);
      const exitTimer = setTimeout(() => {
        setVisible(false);
        onFadeComplete?.();
      }, fadeDuration);
      return () => clearTimeout(exitTimer);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [autoFadeOut, minDuration, fadeDuration, onFadeComplete]);

  if (!visible) return null;

  const fading = manualFading !== undefined ? manualFading : internalFading;

  return (
    <div
      className={
        fullScreen
          ? `fixed inset-0 z-[9999] w-screen h-screen bg-[#0B0B0B] overflow-hidden transition-opacity ease-out ${
              fading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
            }`
          : `relative w-full h-[600px] overflow-hidden bg-[#0B0B0B] transition-opacity ease-out ${
              fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`
      }
      style={{
        transitionDuration: `${fadeDuration}ms`,
        width: fullScreen ? '100vw' : '100%',
        height: fullScreen ? '100vh' : '600px',
        position: fullScreen ? 'fixed' : 'relative',
        inset: 0,
        zIndex: fullScreen ? 9999 : 'auto',
        ...style,
      }}
    >
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
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      />
    </div>
  );
}

export default PrismaticLoader;
