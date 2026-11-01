'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { FlexCarouselItem } from './FlexCarousel';
import type { DevToArticle } from '../lib/devto';
import { articleCover } from '../lib/devto';
import { Reveal } from './Reveal';
import { Arrow, ProjectLabel } from './SiteNavigation';

const FlexCarousel = dynamic(() => import('./FlexCarousel'), { ssr: false });

interface BlogSectionProps {
  articles: any[];
}

export function BlogSection({ articles }: BlogSectionProps) {
  const router = useRouter();

  const items: FlexCarouselItem[] = (articles || []).map((a) => {
    const rawTags = a.tag_list || a.tagList || [];
    const firstTag = Array.isArray(rawTags) && rawTags.length > 0 ? String(rawTags[0]) : '';
    const readMins = a.reading_time_minutes || a.readingTimeMinutes || 5;
    const cover = a.coverImage || a.cover_image || articleCover(a);

    return {
      src: cover,
      alt: a.title,
      title: a.title,
      subtitle: `${readMins} min read${firstTag ? ` · ${firstTag}` : ''}`,
      slug: a.slug,
      url: a.url,
    };
  });

  const handleSelect = (_index: number, item: FlexCarouselItem) => {
    if (item.slug) {
      router.push(`/blog/${item.slug}`);
    } else if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section
      className="w-full border-t border-white/13 bg-[#0B0B0B]"
      id="writing"
      aria-labelledby="writing-title"
    >
      {/* Header */}
      <div className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-[clamp(100px,12vw,160px)] max-sm:pt-24 pb-14 max-sm:pb-10">
        <div className="grid grid-cols-[1.15fr_0.75fr] max-sm:grid-cols-1 items-end gap-[4vw] max-sm:gap-5 mb-14 max-sm:mb-9">
          <Reveal>
            <ProjectLabel>FROM THE BLOG / 05</ProjectLabel>
            <h2
              id="writing-title"
              className="mt-7 max-sm:mt-5 text-[clamp(62px,8.5vw,118px)] max-sm:text-[clamp(62px,15vw,90px)] font-medium leading-[0.84] tracking-[-0.103em] -ml-[0.05em]"
            >
              Words I've<br />
              <span className="text-[#8e8883]">
                shipped<span className="text-ember-soft">.</span>
              </span>
            </h2>
          </Reveal>

          <Reveal delay={120} className="justify-self-end max-sm:justify-self-start max-w-[340px] max-sm:max-w-[355px] pb-2">
            <p className="max-w-[330px] m-0 mb-7 max-sm:mb-5 text-[#aaa39e] text-[13px] max-sm:text-xs leading-[1.8]">
              Thoughts on frontend craft, financial tooling, and the things I've learned building software people use.
            </p>
            <a
              href="/blog"
              className="group inline-flex items-center gap-3.5 text-paper font-mono text-[8px] tracking-[0.1em] transition-colors duration-200 hover:text-ember-soft"
            >
              ALL ARTICLES <Arrow className="text-ember" />
            </a>
          </Reveal>
        </div>
      </div>

      {/* Carousel */}
      <div className="w-full" style={{ height: '540px', position: 'relative' }}>
        {items.length > 0 ? (
          <FlexCarousel
            items={items}
            preset="liquid"
            intro="rise"
            cardHeight={0.5}
            gap={12}
            squeeze={0.2}
            focusOnClick
            captions
            fit="natural"
            radius={0}
            lensWidth={0.74}
            lensHeight={1.18}
            tilt={62}
            roundness={1}
            bend={0.34}
            reach={0.38}
            curl="twist"
            dispersion={0.45}
            liquid={0}
            followCursor={false}
            autoplay={false}
            interval={4}
            captureWheel
            onSelect={handleSelect}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div className="grid grid-cols-3 max-md:grid-cols-1 gap-6 w-full max-w-[1512px] mx-auto px-12 max-sm:px-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 rounded-2xl border border-white/10 bg-[#141210] p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-3.5 w-24 rounded bg-white/5 animate-pulse" />
                  <div className="h-6 w-4/5 rounded bg-white/5 animate-pulse" />
                  <div className="h-3.5 w-full rounded bg-white/5 animate-pulse" />
                  <div className="h-3.5 w-2/3 rounded bg-white/5 animate-pulse" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-[clamp(80px,10vw,140px)] max-sm:h-20" />
    </section>
  );
}

