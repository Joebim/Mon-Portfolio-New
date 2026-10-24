'use client';

import { useState } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  interactive?: boolean;
}

export function SplitText({
  text,
  className = '',
  delay = 100,
  stagger = 35,
  interactive = true,
}: SplitTextProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <span className={`split-text-root ${className}`.trim()} aria-label={text} style={{ display: 'inline-block' }}>
      {text.split('').map((char, index) => {
        const isHovered = hoveredIndex === index;
        const isNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1;

        const charDelay = delay + index * stagger;

        return (
          <span
            key={index}
            className="split-char-wrapper"
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              verticalAlign: 'bottom',
            }}
            onMouseEnter={() => interactive && setHoveredIndex(index)}
            onMouseLeave={() => interactive && setHoveredIndex(null)}
          >
            <span
              className="split-char"
              style={{
                display: 'inline-block',
                whiteSpace: char === ' ' ? 'pre' : 'normal',
                animation: `split-char-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) ${charDelay}ms both`,
                transform: isHovered
                  ? 'translateY(-6px) scale(1.04)'
                  : isNeighbor
                  ? 'translateY(-2px) scale(1.01)'
                  : 'translateY(0)',
                color: isHovered ? 'var(--ember-soft)' : undefined,
                transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.25s',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          </span>
        );
      })}
    </span>
  );
}
