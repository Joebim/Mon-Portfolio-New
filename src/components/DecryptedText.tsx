'use client';

import { useEffect, useRef, useState } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: 'view' | 'hover';
}

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

export function DecryptedText({
  text,
  speed = 40,
  maxIterations = 12,
  sequential = true,
  characters = DEFAULT_CHARS,
  className = '',
  parentClassName = '',
  encryptedClassName = 'decrypted-glyph',
  animateOn = 'view',
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef(false);

  const scramble = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsScrambling(true);

    const length = text.length;
    let iteration = 0;

    intervalRef.current = window.setInterval(() => {
      setDisplayText(() => {
        return text
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '\n' || char === '—' || char === '·') return char;

            if (sequential) {
              const progress = (iteration / maxIterations) * length;
              if (index < progress) {
                return text[index];
              }
            } else if (iteration >= maxIterations) {
              return text[index];
            }

            const randomChar = characters[Math.floor(Math.random() * characters.length)];
            return randomChar;
          })
          .join('');
      });

      iteration += 1;

      if (iteration > (sequential ? maxIterations + length * 0.4 : maxIterations)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
        setIsScrambling(false);
      }
    }, speed);
  };

  useEffect(() => {
    if (animateOn === 'view') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasAnimatedRef.current) {
              hasAnimatedRef.current = true;
              scramble();
            }
          });
        },
        { threshold: 0.1 }
      );

      if (containerRef.current) observer.observe(containerRef.current);
      return () => {
        observer.disconnect();
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [text, animateOn]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' || !isScrambling) {
      scramble();
    }
  };

  return (
    <span
      ref={containerRef}
      className={`decrypted-text-wrap ${parentClassName}`.trim()}
      onMouseEnter={handleMouseEnter}
      style={{ display: 'inline-block' }}
    >
      <span className={className}>
        {displayText.split('').map((char, i) => {
          const isDecrypted = char === text[i];
          return (
            <span
              key={i}
              className={!isDecrypted ? encryptedClassName : undefined}
              style={{
                display: 'inline-block',
                whiteSpace: 'pre',
                opacity: !isDecrypted ? 0.75 : 1,
                color: !isDecrypted ? 'var(--ember-soft)' : undefined,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </span>
    </span>
  );
}
