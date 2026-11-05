'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client runtime error
    console.error('[RootErrorBoundary] Caught unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-[100svh] bg-[#0B0B0B] text-[#ece8e3] flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-ember/15 blur-[150px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-ping" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-red-400 font-semibold">
            SYSTEM NOTICE · RECOVERY ACTIVE
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.04em] mb-4 text-[#eeeae5] leading-[1.05]">
          Something went<br />
          <span className="text-[#8e8883]">off course.</span>
        </h1>

        {/* Description */}
        <p className="font-mono text-xs text-[#a8a19b] max-w-md leading-relaxed mb-6">
          An unexpected interruption occurred during the operation. You can retry the current action, reload the page, or return home safely.
        </p>

        {/* Error digest badge (if present) */}
        {error?.digest && (
          <div className="mb-8 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono text-[9px] text-[#777] tracking-wider max-w-xs truncate">
            ID: {error.digest}
          </div>
        )}

        {/* Action controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-2.5 rounded-full bg-ember text-ink font-mono text-xs font-bold tracking-[0.1em] uppercase hover:bg-ember-soft transition-all duration-200 shadow-[0_8px_24px_rgba(243,109,69,0.3)] cursor-pointer"
          >
            TRY AGAIN ↺
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-paper font-mono text-xs tracking-[0.08em] uppercase hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
          >
            RELOAD PAGE
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-paper font-mono text-xs tracking-[0.08em] uppercase hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
          >
            HOME ↗
          </Link>
        </div>

        {/* Footer */}
        <span className="mt-14 font-mono text-[8px] uppercase tracking-[0.2em] text-[#555]">
          JOSEPH AKINWOLE · SAFE RECOVERY BOUNDARY
        </span>
      </div>
    </div>
  );
}
