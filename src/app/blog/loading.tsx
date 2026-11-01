import { BlogCardSkeleton, Skeleton } from '../../components/Skeleton';
import Link from 'next/link';

export default function BlogLoading() {
  return (
    <main className="min-h-screen bg-[#0B0B0B] text-paper">
      <div className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-10 max-sm:pt-8">
        <Link
          href="/#writing"
          className="inline-flex items-center gap-2.5 text-[#888] font-mono text-[8px] tracking-[0.1em]"
        >
          ← BACK HOME
        </Link>
      </div>

      <header className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-16 pb-12 space-y-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-14 w-80 max-sm:w-60" />
        <Skeleton className="h-4 w-96 max-sm:w-full" />
      </header>

      <div className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pb-24">
        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
          <BlogCardSkeleton />
          <BlogCardSkeleton />
          <BlogCardSkeleton />
          <BlogCardSkeleton />
        </div>
      </div>
    </main>
  );
}

