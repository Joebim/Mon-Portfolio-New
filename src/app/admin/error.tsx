'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminError] Admin console error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-paper flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#141210] border border-red-500/30 text-center space-y-4 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-ping mx-auto" />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-red-400 font-semibold block">
          ADMIN CONSOLE RECOVERY
        </span>
        <h2 className="text-xl font-medium tracking-tight text-paper">
          Dashboard Interrupted
        </h2>
        <p className="font-mono text-xs text-[#8e8883] leading-relaxed">
          The admin dashboard encountered an unexpected issue while interacting with the database or storage. Your authentication session is preserved.
        </p>

        {error?.message && (
          <div className="p-3 rounded-lg bg-black/40 border border-white/10 font-mono text-[10px] text-red-300 text-left overflow-x-auto max-h-28">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-ember text-ink font-mono text-[10px] font-bold tracking-wider hover:bg-ember-soft transition-colors cursor-pointer"
          >
            RETRY ACTION ↺
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-paper font-mono text-[10px] hover:bg-white/10 transition-colors cursor-pointer"
          >
            RELOAD DASHBOARD
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-[#888] hover:text-paper font-mono text-[10px] transition-colors"
          >
            HOME ↗
          </Link>
        </div>
      </div>
    </div>
  );
}

