import Link from 'next/link';

export const metadata = {
  title: '404 — Page Not Found | Joseph Akinwole',
  description: 'The requested page could not be found.',
};

export default function NotFound() {
  return (
    <div className="min-h-[100svh] bg-[#0B0B0B] text-[#ece8e3] flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-ember/10 blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
        {/* Pulsing indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-ember inline-block animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ffb490] font-semibold">
            ERROR 404 · ROUTE NOT FOUND
          </span>
        </div>

        {/* Large headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-medium tracking-[-0.05em] mb-4 text-[#eeeae5] leading-[0.95]">
          Lost in<br />
          <span className="text-[#8e8883]">the grid.</span>
        </h1>

        {/* Subtitle */}
        <p className="font-mono text-xs text-[#a8a19b] max-w-sm leading-relaxed mb-8">
          The requested coordinate does not exist or has been rearranged. Choose a destination below to continue.
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-full bg-[#eeeae5] text-[#0b0b0b] font-mono text-xs font-bold tracking-[0.1em] uppercase hover:bg-ember hover:text-ink transition-all duration-200 shadow-[0_8px_24px_rgba(0,0,0,0.6)] cursor-pointer"
          >
            RETURN HOME ↗
          </Link>
          <Link
            href="/#work"
            className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-paper font-mono text-xs tracking-[0.08em] uppercase hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
          >
            SELECTED WORKS
          </Link>
          <Link
            href="/blog"
            className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-paper font-mono text-xs tracking-[0.08em] uppercase hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
          >
            ALL ARTICLES
          </Link>
        </div>

        {/* Subtle footer stamp */}
        <span className="mt-14 font-mono text-[8px] uppercase tracking-[0.2em] text-[#555]">
          JOSEPH AKINWOLE · ARCHITECTURE & CRAFT
        </span>
      </div>
    </div>
  );
}
