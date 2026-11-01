'use client';

import { useState, useEffect, useRef } from 'react';
import { Reveal } from './Reveal';
import { Magnetic } from './Magnetic';
import { TechText } from './TechText';
import DitherVeil from './DitherVeil';
import { portfolio as defaultPortfolio } from '../data';
import type { PortfolioContent } from '../lib/schemas';

function DownArrow() {
  return (
    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-nudge-down" aria-hidden="true" viewBox="0 0 18 18">
      <path d="M9 2v13M4 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function useSyncFontSize(ref: React.RefObject<HTMLDivElement | null>, defaultSize: number) {
  const [size, setSize] = useState<number>(defaultSize);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const computed = window.getComputedStyle(el);
      const fs = parseFloat(computed.fontSize);
      if (fs && !isNaN(fs)) {
        setSize((prev) => (Math.abs(prev - fs) > 0.25 ? fs : prev));
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref]);

  return size;
}

export function Hero({ portfolio = defaultPortfolio }: { portfolio?: PortfolioContent | any }) {
  const desktopEngineerRef = useRef<HTMLDivElement>(null);
  const desktopFontSize = useSyncFontSize(desktopEngineerRef, 108);

  const mobileEngineerRef = useRef<HTMLDivElement>(null);
  const mobileFontSize = useSyncFontSize(mobileEngineerRef, 44);

  return (
    <section
      className="relative isolate h-[100svh] min-h-[600px] md:h-[max(800px,100svh)] md:min-h-[min(1050px,max(750px,100svh))] overflow-hidden border-b border-[rgba(238,234,229,0.13)] bg-[#0B0B0B]"
      id="home"
      aria-labelledby="hero-title"
    >
      {/* Desktop Top Left: Editorial Context / Greeting (md+) */}
      <div className="hidden md:block absolute z-20 md:top-[220px] lg:top-[250px] md:left-12 lg:left-16 max-w-[380px] lg:max-w-[420px]">
        <Reveal delay={120}>
          <div className="flex items-center gap-2 text-[13px] md:text-sm lg:text-[15px] font-mono uppercase tracking-[0.2em] text-[#ffb490] mb-3">
            <span className="text-lg lg:text-xl leading-none text-[#f36d45]">*</span>
            <span>HELLO, I’M JOSEPH</span>
          </div>
          <p className="font-mono text-[12px] md:text-[13px] lg:text-[14px] uppercase tracking-[0.1em] leading-[1.65] text-[#a8a19b]">
            I BUILD SECURE FINANCIAL TOOLS, THOUGHTFUL PRODUCT INTERFACES, AND USEFUL WEB EXPERIENCES.
          </p>
          <div className="mt-3.5 flex items-center gap-2 font-mono text-[11px] lg:text-[12px] uppercase tracking-widest text-[#736c66]">
            <span className="w-2 h-2 rounded-full bg-[#f36d45]" />
            ONDO, NIGERIA • WORLDWIDE
          </div>
        </Reveal>
      </div>

      {/* Middle Portrait: Interactive DitherVeil on desktop; atmospheric on mobile */}
      <div
        className="hero-portrait-stage absolute z-[5] bottom-0 left-1/2 h-[calc(100%-52px)] sm:h-[calc(100%-56px)] md:h-[calc(100%-60px)] lg:h-[calc(100%-64px)] max-h-[1200px] aspect-[2351/1916] pointer-events-auto select-none flex items-end justify-center origin-bottom max-md:opacity-60"
      >
        <DitherVeil
          src="/joseph-portrait-textured-new.png"
          pattern="floyd"
          pixelSize={2}
          inkColor="#0B0B0B"
          paperColor="#f4f1ea"
          revealRadius={200}
          softness={0.6}
          linger={1}
          fit="contain"
          rimColor="#a78bfa"
          palette="duotone"
          levels={2}
          contrast={1.15}
          brightness={0}
          rim={0}
          reverse={false}
          wander={false}
          clickBurst={true}
          className="relative z-10 w-full h-full filter"
        />
        
        {/* Bottom grounding vignette so torso dissolves seamlessly into base border and text */}
        <div
          className="absolute z-20 inset-x-0 bottom-0 h-80 md:h-32 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/92 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Desktop Right Column: Latest Article Card + Explore The Work Button (md+) */}
      <div className="hidden md:flex absolute z-20 md:top-[16%] lg:top-[18%] xl:top-[20%] md:right-12 lg:right-16 xl:right-24 max-w-[340px] lg:max-w-[360px] flex-col items-center">
        <Reveal delay={240}>
          <a
            href={portfolio.latestArticle?.url ?? 'https://dev.to/joebim'}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="READ"
            className="group block w-full text-left rounded-xl border border-[rgba(238,234,229,0.12)] bg-[#121110]/85 backdrop-blur-md p-4 transition-all duration-300 hover:border-[#f36d45]/60 hover:bg-[#161413] hover:shadow-[0_16px_36px_rgba(0,0,0,0.7),0_0_30px_rgba(243,109,69,0.12)] hover:-translate-y-0.5"
            aria-label={`Read article: ${portfolio.latestArticle?.title ?? 'Latest article'}`}
          >
            {/* Header row: badge + date */}
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[rgba(238,234,229,0.08)]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45] inline-block animate-pulse" />
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#ffb490] font-semibold">
                  LATEST ARTICLE
                </span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#736c66]">
                {(portfolio.latestArticle?.date || portfolio.latestArticle?.publishedAt || 'LATEST')} • {(portfolio.latestArticle?.readingTime || '3 MIN READ')}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-[14.5px] lg:text-[15.5px] font-bold text-[#ece8e3] tracking-tight leading-[1.3] group-hover:text-[#f36d45] transition-colors">
              {portfolio.latestArticle?.title}
            </h3>

            {/* Synopsis */}
            <p className="mt-2 text-[11.5px] leading-[1.55] text-[#9e9690] line-clamp-2">
              {portfolio.latestArticle?.description}
            </p>

            {/* Footer row: platform + link callout */}
            <div className="mt-3 pt-2.5 border-t border-[rgba(238,234,229,0.08)] flex items-center justify-between font-mono text-[9.5px]">
              <span className="text-[#736c66] uppercase tracking-widest flex items-center gap-1.5">
                ON <span className="text-[#a8a19b] font-semibold">{portfolio.latestArticle?.platform}</span>
              </span>
              <span className="text-[#f36d45] uppercase tracking-wider font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                READ POST
                <span className="text-xs leading-none">↗</span>
              </span>
            </div>
          </a>
        </Reveal>

        {/* Circular Explore Button */}
        <div className="mt-8 lg:mt-10 flex items-center justify-center w-full">
          <Magnetic strength={0.42}>
            <a
              href="#work"
              data-cursor="EXPLORE"
              className="w-44 h-44 lg:w-48 lg:h-48 xl:w-52 xl:h-52 rounded-full bg-[#eeeae5] text-[#0b0b0b] font-mono text-xs md:text-sm uppercase tracking-widest font-bold flex flex-col items-center justify-center gap-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.8)] hover:bg-[#f36d45] hover:text-[#0b0b0b] hover:shadow-[0_0_60px_rgba(243,109,69,0.6)] transition-all duration-300 hover:scale-105 group"
              aria-label="Explore the work"
            >
              <span className="text-center px-4 leading-tight group-hover:scale-105 transition-transform">
                EXPLORE<br />THE WORK
              </span>
              <DownArrow />
            </a>
          </Magnetic>
        </div>
      </div>

      {/* Desktop Bottom Left: TechText on "FRONTEND" alone + Crisp Typography on "ENGINEER." (md+) */}
      <div
        id="hero-title"
        className="hidden md:flex absolute z-20 md:bottom-8 lg:bottom-10 md:left-12 lg:left-16 flex-col pointer-events-auto select-none"
        aria-label="Frontend Engineer"
      >
        {/* "FRONTEND" with interactive TechText blueprint effect - exact same font size as ENGINEER. */}
        <div
          className="md:w-[580px] lg:w-[680px] xl:w-[780px]"
          style={{ height: `${desktopFontSize * 1.12}px` }}
        >
          <TechText
            text="FRONTEND"
            fontWeight={900}
            fontSize={desktopFontSize}
            useExactFontSize
            reveal="letter"
            dashLength={4}
            dashGap={2}
            specks={15}
            intro="none"
            introDuration={2}
            clickKick
            guides={false}
            fontFamily="Manrope, sans-serif"
            letterSpacing={-0.045}
            accentColor="#f36d45"
            color="#ece8e3"
            align="left"
            reach={200}
            softness={0.7}
            lineStyle="dashed"
            strokeWidth={1.5}
            speed={1}
            bounce={0.4}
            selection
            labels
            draggable
            sweep
          />
        </div>

        {/* "ENGINEER." in matching crisp, bold architectural typography */}
        <div
          ref={desktopEngineerRef}
          className="md:text-[clamp(76px,7.5vw,110px)] font-[Manrope] font-black uppercase text-[#ece8e3] tracking-[-0.045em] leading-[0.88] select-none md:-mt-3"
        >
          ENGINEER<span className="text-[#f36d45]">.</span>
        </div>
      </div>

      {/* Mobile Unified Bottom Layout (< md): Details UI just above Frontend Engineer, with Explore opposite */}
      <div className="md:hidden absolute z-20 bottom-4 left-4 right-4 xs:left-5 xs:right-5 flex flex-col gap-3 pointer-events-auto select-none">
        {/* Details UI: just above frontend engineer */}
        <div className="flex flex-col gap-1.5 max-w-[330px] xs:max-w-[360px]">
          <div className="flex items-center gap-2 text-xs xs:text-[13px] font-mono uppercase tracking-[0.2em] text-[#ffb490]">
            <span className="text-base leading-none text-[#f36d45]">*</span>
            <span>HELLO, I’M JOSEPH</span>
          </div>
          <p className="font-mono text-[11px] xs:text-[12px] uppercase tracking-[0.09em] leading-[1.5] text-[#b0a8a0]">
            I BUILD SECURE FINANCIAL TOOLS, THOUGHTFUL PRODUCT INTERFACES, AND USEFUL WEB EXPERIENCES.
          </p>
          <div className="flex items-center gap-2 font-mono text-[9.5px] xs:text-[10.5px] uppercase tracking-widest text-[#88817a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45]" />
            <span>ONDO, NIGERIA • WORLDWIDE</span>
          </div>
        </div>

        {/* Bottom Row: Frontend Engineer on Left, Explore The Work on Right (opposite) */}
        <div className="flex items-end justify-between gap-2.5 w-full">
          {/* Left: Frontend Engineer with TechText on FRONTEND - exact same font size as ENGINEER. */}
          <div className="flex flex-col select-none flex-1 min-w-0">
            <div
              className="w-full"
              style={{ height: `${mobileFontSize * 1.1}px` }}
            >
              <TechText
                text="FRONTEND"
                fontWeight={900}
                fontSize={mobileFontSize}
                useExactFontSize
                reveal="letter"
                dashLength={4}
                dashGap={2}
                specks={15}
                intro="none"
                introDuration={2}
                clickKick
                guides={false}
                fontFamily="Manrope, sans-serif"
                letterSpacing={-0.045}
                accentColor="#f36d45"
                color="#ece8e3"
                align="left"
                reach={200}
                softness={0.7}
                lineStyle="dashed"
                strokeWidth={1.5}
                speed={1}
                bounce={0.4}
                selection
                labels
                draggable
                sweep
              />
            </div>
            <div
              ref={mobileEngineerRef}
              className="text-[clamp(38px,11vw,50px)] font-[Manrope] font-black uppercase text-[#ece8e3] tracking-[-0.045em] leading-[0.85] select-none -mt-1"
            >
              ENGINEER<span className="text-[#f36d45]">.</span>
            </div>
          </div>

          {/* Right: Circular Explore The Work Button opposite Frontend Engineer */}
          <div className="flex-none pb-0.5">
            <Magnetic strength={0.35}>
              <a
                href="#work"
                data-cursor="EXPLORE"
                className="w-[72px] h-[72px] xs:w-[80px] xs:h-[80px] sm:w-[88px] sm:h-[88px] rounded-full bg-[#eeeae5] text-[#0b0b0b] font-mono text-[7px] xs:text-[7.5px] uppercase tracking-wider font-bold flex flex-col items-center justify-center gap-1 shadow-[0_8px_24px_rgba(0,0,0,0.85)] hover:bg-[#f36d45] hover:text-[#0b0b0b] hover:shadow-[0_0_36px_rgba(243,109,69,0.6)] transition-all duration-300 active:scale-95 group"
                aria-label="Explore the work"
              >
                <span className="text-center px-1 leading-tight group-hover:scale-105 transition-transform">
                  EXPLORE<br />THE WORK
                </span>
                <DownArrow />
              </a>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}
