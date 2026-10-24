'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import josephPortraitCropped from '../../public/joseph-portrait-cropped.png';
import { josephPortraitCroppedBlurDataURL } from '../lib/image-placeholders';
import { Reveal } from './Reveal';
import { ParticleCanvas } from './ParticleCanvas';
import { Magnetic } from './Magnetic';
import { TechText } from './TechText';
import { portfolio } from '../data';

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

export function Hero() {
  const desktopEngineerRef = useRef<HTMLDivElement>(null);
  const desktopFontSize = useSyncFontSize(desktopEngineerRef, 108);

  const mobileEngineerRef = useRef<HTMLDivElement>(null);
  const mobileFontSize = useSyncFontSize(mobileEngineerRef, 44);
  const heroRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const portrait = portraitRef.current;
    if (!hero || !portrait) return;

    const finePointer = window.matchMedia('(min-width: 769px) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reducedMotion.matches) return;

    const current = { x: 0, y: 0, glowX: 0, glowY: 0, opacity: 0 };
    const target = { ...current };
    let frame = 0;

    const animate = () => {
      current.x += (target.x - current.x) * 0.14;
      current.y += (target.y - current.y) * 0.14;
      current.glowX += (target.glowX - current.glowX) * 0.14;
      current.glowY += (target.glowY - current.glowY) * 0.14;
      current.opacity += (target.opacity - current.opacity) * 0.14;

      portrait.style.setProperty('--portrait-x', `${current.x * 8}px`);
      portrait.style.setProperty('--portrait-y', `${current.y * 5}px`);
      portrait.style.setProperty('--portrait-rx', `${-current.y * 1.6}deg`);
      portrait.style.setProperty('--portrait-ry', `${current.x * 1.9}deg`);
      hero.style.setProperty('--hero-glow-x', `${current.glowX}px`);
      hero.style.setProperty('--hero-glow-y', `${current.glowY}px`);
      hero.style.setProperty('--hero-glow-opacity', `${current.opacity}`);

      const distance =
        Math.abs(target.x - current.x) +
        Math.abs(target.y - current.y) +
        Math.abs(target.glowX - current.glowX) / Math.max(1, hero.clientWidth) +
        Math.abs(target.glowY - current.glowY) / Math.max(1, hero.clientHeight) +
        Math.abs(target.opacity - current.opacity);

      if (distance < 0.003) {
        Object.assign(current, target);
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(animate);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const reset = () => {
      target.x = 0;
      target.y = 0;
      target.opacity = 0;
      portrait.style.setProperty('--portrait-scale', '1');
      schedule();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches || !finePointer.matches) return;
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;

      const eventTarget = event.target;
      if (eventTarget instanceof Element && eventTarget.closest('a, button, [role="button"]')) {
        reset();
        return;
      }

      const heroBounds = hero.getBoundingClientRect();
      if (!heroBounds.width || !heroBounds.height) return;
      target.x = ((event.clientX - heroBounds.left) / heroBounds.width - 0.5) * 2;
      target.y = ((event.clientY - heroBounds.top) / heroBounds.height - 0.5) * 2;
      target.glowX = event.clientX - heroBounds.left;
      target.glowY = event.clientY - heroBounds.top;
      target.opacity = 0.9;

      const portraitBounds = portrait.getBoundingClientRect();
      const faceX = (event.clientX - portraitBounds.left) / portraitBounds.width;
      const faceY = (event.clientY - portraitBounds.top) / portraitBounds.height;
      const overFace = faceX > 0.34 && faceX < 0.69 && faceY > 0.08 && faceY < 0.52;
      portrait.style.setProperty('--portrait-scale', overFace ? '1.025' : '1');
      schedule();
    };

    const handleMotionPreference = () => {
      if (reducedMotion.matches || !finePointer.matches) reset();
    };

    const handleVisibility = () => {
      if (document.hidden) reset();
    };

    hero.addEventListener('pointermove', handlePointerMove, { passive: true });
    hero.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', handleVisibility);
    finePointer.addEventListener('change', handleMotionPreference);
    reducedMotion.addEventListener('change', handleMotionPreference);

    return () => {
      hero.removeEventListener('pointermove', handlePointerMove);
      hero.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', handleVisibility);
      finePointer.removeEventListener('change', handleMotionPreference);
      reducedMotion.removeEventListener('change', handleMotionPreference);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative isolate h-[100svh] min-h-[600px] md:h-[max(800px,100svh)] md:min-h-[min(1050px,max(750px,100svh))] overflow-hidden border-b border-[rgba(238,234,229,0.13)] bg-[#0b0b0b] bg-[radial-gradient(ellipse_at_50%_40%,rgba(243,109,69,0.12),transparent_60%),radial-gradient(ellipse_at_20%_80%,rgba(30,20,16,0.6),transparent_60%)]"
      id="home"
      aria-labelledby="hero-title"
    >
      {/* Precision architectural background grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(rgba(236,215,195,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(236,215,195,0.032)_1px,transparent_1px)] bg-[size:93px_93px] [mask-image:linear-gradient(to_bottom,transparent,#000_15%,#000_80%,transparent)]"
        aria-hidden="true"
      />

      {/* Fluid interactive particle constellation canvas */}
      <ParticleCanvas />

      {/* Desktop Top Left: Editorial Context / Greeting (md+) */}
      <div className="hidden md:block absolute z-20 md:top-[220px] lg:top-[250px] md:left-12 lg:left-16 max-w-[320px]">
        <Reveal delay={120}>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#ffb490] mb-2.5">
            <span className="text-base leading-none text-[#f36d45]">*</span>
            <span>HELLO, I’M JOSEPH</span>
          </div>
          <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.12em] leading-[1.65] text-[#9e9690]">
            SPECIALIZING IN PRODUCTION-GRADE FINANCIAL TOOLS, HIGH-AVAILABILITY CLOUD APIS, AND POLISHED USER INTERFACES.
          </p>
          <div className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-[#736c66]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45]" />
            ONDO, NIGERIA • WORLDWIDE
          </div>
        </Reveal>
      </div>

      {/* Soft atmospheric radial halo behind portrait, blending seamlessly through navbar */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none bg-[radial-gradient(ellipse_at_50%_38%,rgba(243,109,69,0.36),rgba(32,18,14,0.65)_46%,transparent_72%)]"
        aria-hidden="true"
      />

      {/* Fine-pointer ember light, inspired by 21st.dev spotlight hero treatments */}
      <div className="hero-pointer-spotlight absolute inset-0 z-[3] pointer-events-none" aria-hidden="true" />

      {/* Middle Portrait: Towering on desktop; crisp atmospheric portrait on mobile */}
      <div
        ref={portraitRef}
        className="hero-portrait-stage absolute z-[5] bottom-0 left-1/2 h-[calc(100%-52px)] sm:h-[calc(100%-56px)] md:h-[calc(100%-60px)] lg:h-[calc(100%-64px)] max-h-[1200px] aspect-[2351/1916] pointer-events-none select-none flex items-end justify-center origin-bottom max-md:opacity-40"
        aria-hidden="true"
      >
        {/* Cutout Portrait centered and towering toward nav links */}
        <Image
          src={josephPortraitCropped}
          placeholder="blur"
          blurDataURL={josephPortraitCroppedBlurDataURL}
          alt="Joseph Akinwole — Full Stack Engineer"
          width={2351}
          height={1916}
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 50vw"
          className="relative z-10 w-full h-full object-contain object-bottom filter drop-shadow-[0_28px_80px_rgba(0,0,0,0.95)] transition-all duration-700 animate-[hero-line-in_1.1s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]"
        />

        {/* Bottom grounding vignette so torso dissolves seamlessly into base border and text */}
        <div
          className="absolute z-20 inset-x-0 bottom-0 h-80 md:h-32 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/92 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Desktop Right Column: Intro text + Explore The Work Button (md+) */}
      <div className="hidden md:flex absolute z-20 md:top-[22%] lg:top-[26%] md:right-12 lg:right-16 xl:right-24 max-w-[360px] flex-col items-center">
        <Reveal delay={240}>
          <div className="w-full">
            <p className="text-[18px] lg:text-[20px] font-semibold text-[#ece8e3] tracking-tight leading-[1.35] mb-2.5">
              {portfolio.profile.heroIntro}
            </p>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase text-[#f36d45]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45] inline-block animate-pulse" />
              <span>ENGINEERED FOR SCALE</span>
            </div>
          </div>
        </Reveal>

        {/* Circular Explore Button */}
        <div className="mt-10 lg:mt-12 flex items-center justify-center w-full">
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
        <div className="flex flex-col gap-1 max-w-[320px] xs:max-w-[340px]">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#ffb490]">
            <span className="text-base leading-none text-[#f36d45]">*</span>
            <span>HELLO, I’M JOSEPH</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[8px] xs:text-[8.5px] uppercase tracking-widest text-[#88817a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45]" />
            <span>ONDO, NIGERIA • WORLDWIDE</span>
          </div>
          <p className="text-[13px] xs:text-[14px] font-medium text-[#ece8e3] tracking-tight leading-[1.3] pt-0.5">
            {portfolio.profile.heroIntro}
          </p>
          <div className="flex items-center gap-2 font-mono text-[8.5px] xs:text-[9px] tracking-[0.2em] uppercase text-[#f36d45] pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45] inline-block animate-pulse" />
            <span>ENGINEERED FOR SCALE</span>
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
