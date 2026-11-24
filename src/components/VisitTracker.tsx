'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function VisitTracker() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string>('');

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (lastTrackedRef.current === pathname) return;
    lastTrackedRef.current = pathname;

    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {
      // silent fail
    });
  }, [pathname]);

  return null;
}
