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
 * Full Homepage Skeleton (used in loading.tsx for instant SSR response)
 */
export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-paper font-sans">
      {/* Hero Skeleton */}
      <section className="h-[90vh] min-h-[600px] border-b border-white/10 p-12 flex flex-col justify-between max-w-[1512px] mx-auto">
        <div className="space-y-4 max-w-md pt-12">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-80" />
          <SkeletonText lines={2} />
        </div>
        <div className="flex justify-between items-end">
          <Skeleton className="h-24 w-96 rounded-xl" />
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>
      </section>

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

