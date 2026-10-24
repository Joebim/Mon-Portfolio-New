'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface CursorState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  scaleVx: number;
  scaleVy: number;
  isHovering: boolean;
  isClicking: boolean;
  hoverText: string;
  magneticTarget: HTMLElement | null;
  magneticRect: DOMRect | null;
  isVisible: boolean;
}

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

/**
 * Contextual hover action tags
 */
function getHoverAction(el: HTMLElement): string {
  const explicit = el.closest<HTMLElement>('[data-cursor]')?.getAttribute('data-cursor');
  if (explicit) return explicit.trim().toUpperCase();

  const link = el.tagName === 'A' ? (el as HTMLAnchorElement) : el.closest('a') || el.querySelector('a');
  const href = el.getAttribute('href') || link?.getAttribute('href') || '';
  const text = (el.textContent || '').trim().toLowerCase();
  const ariaLabel = (el.getAttribute('aria-label') || link?.getAttribute('aria-label') || '').toLowerCase();

  if (href === '#work' || text.includes('explore') || ariaLabel.includes('explore')) {
    return 'EXPLORE';
  }
  if (el.closest('.project-card') || el.closest('[data-project]') || ariaLabel.includes('project') || text.includes('case study')) {
    return 'VIEW';
  }
  if (href.startsWith('mailto:') || href === '#contact' || text.includes('talk') || ariaLabel.includes('talk') || text.includes('contact')) {
    return 'TALK';
  }
  if (href.includes('github.com') || text.includes('code') || text.includes('repo')) {
    return 'CODE';
  }
  if (href.startsWith('http') || (el.tagName === 'A' && (el as HTMLAnchorElement).target === '_blank')) {
    return 'VISIT';
  }
  if (el.closest('nav') || href.startsWith('#')) {
    return 'GO';
  }
  if (el.tagName === 'CANVAS' || el.closest('[data-tech-text]') || el.id === 'hero-title') {
    return 'DRAG';
  }
  if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
    return 'CLICK';
  }

  return 'CLICK';
}

export function FluidMagneticCursor() {
  const [enabled, setEnabled] = useState(false);
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const blobRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const state = useRef<CursorState>({
    x: -100,
    y: -100,
    targetX: -100,
    targetY: -100,
    vx: 0,
    vy: 0,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    scaleVx: 0,
    scaleVy: 0,
    isHovering: false,
    isClicking: false,
    hoverText: 'EXPLORE',
    magneticTarget: null,
    magneticRect: null,
    isVisible: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || prefersReduced) return;

    setEnabled(true);

    const onMouseMove = (e: MouseEvent) => {
      state.current.targetX = e.clientX;
      state.current.targetY = e.clientY;
      state.current.isVisible = true;

      let target = e.target as HTMLElement | null;
      if (!target || target === document.body || target === document.documentElement) {
        target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      }

      const interactiveEl = target?.closest<HTMLElement>(
        'a, button, [role="button"], input, textarea, select, [data-magnetic], [data-cursor], .cursor-interactive, .magnetic-wrap, canvas'
      );

      if (interactiveEl) {
        state.current.isHovering = true;
        state.current.magneticTarget = interactiveEl;
        state.current.magneticRect = interactiveEl.getBoundingClientRect();
        const action = getHoverAction(interactiveEl);
        if (textRef.current) {
          textRef.current.textContent = action;
        }
      } else {
        state.current.isHovering = false;
        state.current.magneticTarget = null;
        state.current.magneticRect = null;
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      state.current.isClicking = true;
      const newRipple: ClickRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      };
      setRipples((prev) => [...prev.slice(-3), newRipple]);
    };

    const onMouseUp = () => {
      state.current.isClicking = false;
    };

    const onMouseLeave = () => {
      state.current.isVisible = false;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave, { passive: true });

    let rafId: number;

    const tick = () => {
      const s = state.current;
      const blob = blobRef.current;
      const dot = dotRef.current;
      const text = textRef.current;

      let destX = s.targetX;
      let destY = s.targetY;

      // Magnetic snapping to interactive target center
      if (s.magneticTarget && s.magneticRect) {
        const rect = s.magneticTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const magneticPull = 0.58;
        destX = s.targetX + (centerX - s.targetX) * magneticPull;
        destY = s.targetY + (centerY - s.targetY) * magneticPull;
      }

      // Fast, responsive adaptive follow physics
      const dist = Math.hypot(destX - s.x, destY - s.y);
      const lerp = Math.min(0.55 + dist * 0.0018, 0.82);
      const prevX = s.x;
      const prevY = s.y;

      s.x += (destX - s.x) * lerp;
      s.y += (destY - s.y) * lerp;

      s.vx = s.x - prevX;
      s.vy = s.y - prevY;
      const speed = Math.hypot(s.vx, s.vy);

      // Organic fluid blob angle & stretch physics (disabled during hover to keep strict circle)
      let targetScaleX = 1;
      let targetScaleY = 1;

      if (!s.isHovering && speed > 0.8) {
        const targetAngle = Math.atan2(s.vy, s.vx) * (180 / Math.PI);
        let diff = targetAngle - s.angle;
        while (diff < -180) diff += 360;
        while (diff > 180) diff -= 360;
        s.angle += diff * 0.65;

        const stretch = Math.min(speed * 0.045, 0.82);
        targetScaleX = 1 + stretch;
        targetScaleY = 1 / Math.sqrt(targetScaleX);
      } else {
        targetScaleX = 1;
        targetScaleY = 1;
      }

      const springStiffness = 0.28;
      const damping = 0.72;
      s.scaleVx += (targetScaleX - s.scaleX) * springStiffness;
      s.scaleVx *= damping;
      s.scaleX += s.scaleVx;

      s.scaleVy += (targetScaleY - s.scaleY) * springStiffness;
      s.scaleVy *= damping;
      s.scaleY += s.scaleVy;

      if (blob && dot) {
        if (!s.isVisible) {
          blob.style.opacity = '0';
          dot.style.opacity = '0';
          if (text) text.style.opacity = '0';
        } else {
          blob.style.opacity = '1';

          if (s.isHovering) {
            // PURE CSS INVERSION LENS (mix-blend-mode: difference on white circular lens)
            blob.style.backgroundColor = '#ffffff';
            blob.style.mixBlendMode = 'difference';
            blob.style.borderRadius = '50%'; // STRICT CIRCLE - NEVER ROUNDED SQUARE
            blob.style.boxShadow = 'none';

            // Expanded circular lens size
            const hoverSize = s.isClicking ? 70 : 88;
            blob.style.width = `${hoverSize}px`;
            blob.style.height = `${hoverSize}px`;
            blob.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%)`;

            // Hide normal center dot when in inversion mode
            dot.style.opacity = '0';
            dot.style.transform = `translate3d(${s.targetX}px, ${s.targetY}px, 0) translate(-50%, -50%) scale(0)`;

            // Show dynamic text centered on the lens
            if (text) {
              text.style.opacity = '1';
            }
          } else {
            // Normal state: Solid Ember Blob with fluid organic movement
            blob.style.backgroundColor = '#f36d45';
            blob.style.mixBlendMode = 'normal';
            blob.style.boxShadow = '0 0 24px rgba(243, 109, 69, 0.7), 0 2px 12px rgba(0, 0, 0, 0.4)';

            // Dynamic organic fluid border-radius morphing (amoeba/droplet shape while moving)
            const t = performance.now() * 0.009;
            const wobble = Math.min(speed * 0.1, 1.4);
            if (wobble > 0.06) {
              const r1 = Math.round(50 + Math.sin(t * 1.6) * 16 * wobble);
              const r2 = Math.round(50 + Math.cos(t * 1.9) * 18 * wobble);
              const r3 = Math.round(50 - Math.sin(t * 1.4) * 16 * wobble);
              const r4 = Math.round(50 - Math.cos(t * 1.7) * 14 * wobble);
              blob.style.borderRadius = `${r1}% ${100 - r1}% ${r2}% ${100 - r2}% / ${r3}% ${r4}% ${100 - r4}% ${100 - r3}%`;
            } else {
              blob.style.borderRadius = '50%';
            }

            const baseSize = s.isClicking ? 22 : 32;
            blob.style.width = `${baseSize}px`;
            blob.style.height = `${baseSize}px`;
            blob.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) rotate(${s.angle}deg) scale(${s.scaleX}, ${s.scaleY})`;

            // Show center crisp white dot
            dot.style.opacity = '1';
            dot.style.transform = `translate3d(${s.targetX}px, ${s.targetY}px, 0) translate(-50%, -50%) scale(${
              s.isClicking ? 0.65 : 1
            })`;

            if (text) {
              text.style.opacity = '0';
            }
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  // Clean up ripple effects
  useEffect(() => {
    if (ripples.length === 0) return;
    const timeout = setTimeout(() => {
      setRipples((prev) => prev.slice(1));
    }, 550);
    return () => clearTimeout(timeout);
  }, [ripples]);

  if (!enabled) return null;

  return (
    <>
      {/* Pure CSS Inversion Lens Circle with Dynamic Action Text inside */}
      <div
        ref={blobRef}
        id="inversion-lens"
        className="pointer-events-none will-change-transform select-none flex items-center justify-center transition-[background-color,mix-blend-mode,box-shadow] duration-200"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          borderRadius: '50%',
          zIndex: 999998,
          transform: 'translate(-50%, -50%)',
        } as CSSProperties}
      >
        <span
          ref={textRef}
          className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-center leading-none select-none pointer-events-none transition-opacity duration-150"
          style={{
            opacity: 0,
            color: '#000000',
          }}
        >
          EXPLORE
        </span>
      </div>

      {/* Crisp Pure White Center Dot (active in non-hover state) */}
      <div
        ref={dotRef}
        className="pointer-events-none will-change-transform transition-opacity duration-150"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 0 8px #ffffff, 0 0 16px rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.6)',
          zIndex: 1000000,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Fluid Click Ripples */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="fixed rounded-full border border-white/80 pointer-events-none animate-[cursor-ripple_0.45s_cubic-bezier(0.16,1,0.3,1)_forwards]"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            zIndex: 1000001,
          }}
        />
      ))}
    </>
  );
}

export default FluidMagneticCursor;
