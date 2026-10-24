'use client';

import { useState, useRef, type ReactNode, type MouseEvent } from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  perspective?: number;
  href?: string;
}

export function TiltCard({
  children,
  className = '',
  maxTilt = 14,
  perspective = 800,
  href,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement | HTMLAnchorElement | null>(null);
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg)');
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTransform(`perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale3d(1.02, 1.02, 1.02)`);
    setSpotlightPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale3d(1, 1, 1)');
    setSpotlightPos((prev) => ({ ...prev, opacity: 0 }));
  };

  const Component = href ? 'a' : 'div';
  const props = href ? { href } : {};

  return (
    <Component
      // @ts-expect-error ref polymorphism
      ref={cardRef}
      className={`relative block ${className}`.trim()}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      {...props}
    >
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit] z-[2]"
        style={{
          background: `radial-gradient(circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(243, 109, 69, 0.22), transparent 60%)`,
          opacity: spotlightPos.opacity,
          transition: 'opacity 0.3s ease',
        }}
        aria-hidden="true"
      />
      <div className="relative z-[1]">{children}</div>
    </Component>
  );
}
