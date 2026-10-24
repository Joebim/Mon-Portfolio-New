'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  role?: string;
};

export function Reveal({ children, className = '', delay = 0, role }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.14, rootMargin: '0px 0px -36px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} role={role} className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()} style={{ transitionDelay: `${delay}ms` }}>
    {children}
  </div>;
}
