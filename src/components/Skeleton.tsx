'use client';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base animated skeleton shimmer box
 */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden rounded bg-[#181614] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.05] before:to-transparent ${className}`}
    />
  );
}

/**
 * Multi-line text skeleton
 */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${
            i === lines - 1 ? 'w-3/5' : i === 0 ? 'w-full' : 'w-4/5'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Project card skeleton for homepage & works
 */
export function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111110] p-6 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <SkeletonText lines={2} />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Blog article card skeleton
 */
export function BlogCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-[#111110] space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-4/5" />
      <SkeletonText lines={2} />
      <div className="flex justify-between items-center pt-2 border-t border-white/5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/**
 * Admin Dashboard full Skeleton loader
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-paper font-sans animate-fade-in">
      {/* Top Header Skeleton */}
      <header className="sticky top-0 z-40 bg-[#0B0B0B]/90 backdrop-blur-md border-b border-white/13 px-8 max-sm:px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-7 h-7 rounded bg-white/10" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto px-8 max-sm:px-4 py-8 space-y-8">
        {/* Navigation Tabs Skeleton */}
        <div className="flex flex-wrap gap-2 pb-6 border-b border-white/13">
          {['01 / Profile', '02 / Works', '03 / Experiments', '04 / Career', '05 / Skills', '06 / Blogs'].map((_, i) => (
            <Skeleton key={i} className="h-8 w-36 rounded-lg" />
          ))}
        </div>

        {/* Content Area Skeleton */}
        <div className="space-y-6 max-w-[900px]">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#111110] border border-white/10 space-y-4">
            <Skeleton className="h-5 w-48 mb-2" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-9 w-full rounded" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-9 w-full rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-9 w-full rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-20 w-full rounded" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#111110] border border-white/10 space-y-4">
            <Skeleton className="h-5 w-40 mb-2" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-9 w-full rounded" />
              <Skeleton className="h-9 w-full rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hero Section Skeleton matching the exact layout, geometry, and coordinates of Hero.tsx
 */
export function HeroSkeleton() {
  return (
    <section
      className="relative isolate h-[100svh] min-h-[600px] md:h-[max(800px,100svh)] md:min-h-[min(1050px,max(750px,100svh))] overflow-hidden border-b border-[rgba(238,234,229,0.13)] bg-[#0B0B0B]"
      aria-label="Loading hero..."
    >
      {/* Desktop Top Left: Editorial Context / Greeting (md+) */}
      <div className="hidden md:block absolute z-20 md:top-[220px] lg:top-[250px] md:left-12 lg:left-16 w-full max-w-[380px] lg:max-w-[420px] space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f36d45]/40 animate-pulse" />
          <Skeleton className="h-3.5 w-36" />
        </div>
        <div className="space-y-2 pt-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[88%]" />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#736c66]/40" />
          <Skeleton className="h-2.5 w-44" />
        </div>
      </div>

      {/* Middle Portrait Silhouette */}
      <div className="hero-portrait-stage absolute z-[5] bottom-0 left-1/2 -translate-x-1/2 h-[calc(100%-52px)] sm:h-[calc(100%-56px)] md:h-[calc(100%-60px)] lg:h-[calc(100%-64px)] max-h-[1200px] aspect-[2351/1916] pointer-events-none select-none flex items-end justify-center">
        <div className="w-[82%] h-[88%] rounded-t-full bg-gradient-to-t from-[#161514]/70 via-[#181614]/30 to-transparent blur-md" />
        <div className="absolute z-20 inset-x-0 bottom-0 h-80 md:h-32 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/92 to-transparent" />
      </div>

      {/* Desktop Right Column: Latest Article Card + Explore The Work Circle (md+) */}
      <div className="hidden md:flex absolute z-20 md:top-[16%] lg:top-[18%] xl:top-[20%] md:right-12 lg:right-16 xl:right-24 w-full max-w-[340px] lg:max-w-[360px] flex-col items-center">
        {/* Article Card Skeleton */}
        <div className="w-full rounded-xl border border-[rgba(238,234,229,0.12)] bg-[#121110]/85 p-4 space-y-3 shadow-xl">
          <div className="flex justify-between items-center pb-2.5 border-b border-[rgba(238,234,229,0.08)]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45]/40 animate-pulse" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-2.5 w-28" />
          </div>
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-1 pt-1">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-4/5" />
          </div>
          <div className="pt-2.5 border-t border-[rgba(238,234,229,0.08)] flex justify-between items-center">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>

        {/* Circular Explore Button Skeleton */}
        <div className="mt-8 lg:mt-10 flex items-center justify-center">
          <Skeleton className="w-44 h-44 lg:w-48 lg:h-48 xl:w-52 xl:h-52 rounded-full border border-white/10" />
        </div>
      </div>

      {/* Desktop Bottom Left: Huge Typography Blocks (md+) */}
      <div className="hidden md:flex absolute z-20 md:bottom-8 lg:bottom-10 md:left-12 lg:left-16 flex-col space-y-2 pointer-events-none">
        <Skeleton className="h-[96px] lg:h-[115px] md:w-[480px] lg:w-[600px] xl:w-[700px] rounded-lg bg-[#181614]/80" />
        <Skeleton className="h-[80px] lg:h-[98px] md:w-[420px] lg:w-[520px] xl:w-[620px] rounded-lg bg-[#181614]/80" />
      </div>

      {/* Mobile Unified Bottom Layout (< md) */}
      <div className="md:hidden absolute z-20 bottom-4 left-4 right-4 xs:left-5 xs:right-5 flex flex-col gap-3 pointer-events-none">
        <div className="space-y-2 max-w-[320px]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45]/40 animate-pulse" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-4/5" />
          </div>
          <Skeleton className="h-2 w-36" />
        </div>

        <div className="flex items-end justify-between gap-2.5 w-full pt-1">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-10 w-44 rounded bg-[#181614]/80" />
            <Skeleton className="h-9 w-36 rounded bg-[#181614]/80" />
          </div>
          <Skeleton className="w-[72px] h-[72px] xs:w-[80px] xs:h-[80px] rounded-full shrink-0 border border-white/10" />
        </div>
      </div>
    </section>
  );
}

/**
 * Full Homepage Skeleton (used in loading.tsx for instant SSR response)
 */
export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-paper font-sans">
      {/* Hero Skeleton - matching exact geometry */}
      <HeroSkeleton />

      {/* Selected Works Skeleton */}
      <section className="py-24 max-w-[1512px] mx-auto px-12 space-y-8">
        <div className="flex justify-between items-end">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-12 w-72" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      </section>
    </div>
  );
}

/**
 * Blog Detail Skeleton
 */
export function BlogDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-paper max-w-4xl mx-auto px-6 py-16 space-y-8">
      <Skeleton className="h-3 w-24" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
      <div className="space-y-4 pt-4">
        <SkeletonText lines={4} />
        <SkeletonText lines={5} />
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

