import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[100svh] bg-[#0B0B0B] text-[#ece8e3] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-2.5 h-2.5 rounded-full bg-ember animate-pulse mb-6" />
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ember font-semibold mb-3">
        404 — NOT FOUND
      </span>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.04em] mb-4 text-[#eeeae5]">
        Lost in the grid.
      </h1>
      <p className="font-mono text-xs text-[#8e8883] max-w-md leading-relaxed mb-8">
        The coordinate you are looking for does not exist or has been shifted in the architecture.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full bg-[#eeeae5] text-[#0b0b0b] font-mono text-xs font-bold tracking-[0.1em] uppercase hover:bg-ember hover:text-ink transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
      >
        Return to Home ↗
      </Link>
    </div>
  );
}
