'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EMAIL, GITHUB_URL, professionalLinks } from '../data';

type IconProps = { className?: string };
export function Arrow({ className = '' }: IconProps) {
  return (
    <svg
      className={`w-4 h-4 flex-none stroke-current fill-none stroke-[1.25] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${className}`.trim()}
      aria-hidden="true"
      viewBox="0 0 18 18"
    >
      <path d="M4 14 14 4M5 4h9v9" />
    </svg>
  );
}

export function BrandMark() {
  return (
    <a
      className="group inline-flex min-w-[165px] max-sm:min-w-0 items-center gap-2.5 max-sm:gap-2 focus-visible:outline-2 focus-visible:outline-ember-soft focus-visible:outline-offset-4"
      href="#home"
      aria-label="Joseph Akinwole, back to top"
    >
      <span className="grid w-[38px] h-[38px] max-sm:w-[34px] max-sm:h-[34px] p-1.5 place-items-center rounded-[11px] bg-ember -rotate-6 transition-all duration-350 group-hover:rounded-full group-hover:rotate-6 group-hover:scale-105 shadow-[0_2px_12px_rgba(243,109,69,0.3)]">
        <img
          src="/joseph-logo-light.svg"
          alt="Joseph Akinwole logo"
          className="w-full h-full object-contain pointer-events-none"
          width={26}
          height={26}
        />
      </span>
      <span className="text-[9px] max-sm:text-[8px] font-bold leading-[1.35] tracking-[0.105em]">
        JOSEPH<br />AKINWOLE
      </span>
    </a>
  );
}

export function SocialLinks({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2.5 max-sm:gap-1.5 mt-6 ${className}`.trim()}>
      {professionalLinks.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-2.5 max-sm:py-1.5 max-sm:px-2 border border-white/15 text-[#d1c9c1] font-mono text-[7px] max-sm:text-[6px] tracking-[0.08em] transition-colors duration-200 hover:border-ember hover:bg-ember/10 hover:text-ember-soft focus-visible:outline-2 focus-visible:outline-ember-soft"
        >
          {link.short} ↗
        </a>
      ))}
    </div>
  );
}

export function ProjectLabel({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-3 text-[#a49d98] font-mono text-[8px] tracking-[0.13em]">
      <span className="inline-block w-5.5 h-[1px] bg-ember" />
      {children}
    </span>
  );
}

export const navigation = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Selected work' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
];

export function SiteNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('home');
  const menuPanelRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let frame = 0;
    const heroStage = document.querySelector<HTMLElement>('.hero__stage');
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);
        heroStage?.style.setProperty('--hero-parallax', `${Math.min(window.scrollY, 700) * -0.12}px`);
      });
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });

    const sections = navigation
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries.find((entry) => entry.isIntersecting);
        if (current) setActiveSection(current.target.id);
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateProgress);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.classList.add('menu-is-open');
    const firstFocus = window.setTimeout(
      () => menuPanelRef.current?.querySelector<HTMLElement>('a[href]')?.focus(),
      120
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !menuPanelRef.current) return;
      const items = Array.from(
        menuPanelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      );
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first && last) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last && first) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(firstFocus);
      document.body.classList.remove('menu-is-open');
      window.removeEventListener('keydown', onKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {/* Skip Link for Accessibility */}
      <a
        className="fixed z-[200] -top-[70px] left-[18px] py-3 px-4 bg-paper text-ink font-mono text-[9px] tracking-[0.08em] transition-[top] duration-200 focus:top-[15px]"
        href="#main"
      >
        Skip to content
      </a>

      {/* Reading Progress Indicator */}
      <div className="fixed z-[120] inset-x-0 top-0 h-[2px] pointer-events-none" aria-hidden="true">
        <span
          className="block w-full h-full origin-left bg-ember transition-transform duration-75"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Top Header */}
      <header className="absolute z-[70] top-0 left-0 flex w-full items-center justify-between py-8 max-sm:pt-5 px-[clamp(24px,6.4vw,105px)] max-sm:px-6">
        <BrandMark />

        <nav className="flex max-sm:hidden items-center gap-[clamp(23px,3vw,48px)]" aria-label="Main navigation">
          {navigation.slice(1).map(({ id, label }) => {
            const isActive = activeSection === id;
            return (
              <a
                key={id}
                data-cursor={id === 'work' ? 'EXPLORE' : id === 'about' ? 'ABOUT' : id === 'experience' ? 'CAREER' : 'TALK'}
                className={`relative py-2.5 font-mono text-[10px] tracking-[0.055em] uppercase transition-colors duration-250 hover:text-paper after:absolute after:inset-x-0 after:bottom-1 after:h-[1px] after:bg-ember after:origin-left after:transition-transform after:duration-300 ${
                  isActive ? 'text-paper after:scale-x-100' : 'text-[#b6b1ac] after:scale-x-0 hover:after:scale-x-100'
                }`}
                href={`#${id}`}
              >
                {label}
              </a>
            );
          })}
        </nav>

        <div className="flex min-w-[165px] max-sm:min-w-0 items-center justify-end gap-20">
          <button
            ref={menuButtonRef}
            className="group relative z-[82] flex w-12 h-10.5 items-center justify-center flex-col gap-1.25 bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-ember-soft"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span
              className={`h-[1px] bg-paper transition-all duration-320 ${
                menuOpen ? 'w-[23px] translate-y-[3px] rotate-45 bg-ember-soft' : 'w-[23px]'
              }`}
            />
            <span
              className={`h-[1px] bg-paper transition-all duration-320 ${
                menuOpen ? 'w-[23px] ml-0 -translate-y-[3px] -rotate-45 bg-ember-soft' : 'w-[15px] ml-2 group-hover:w-[23px] group-hover:ml-0'
              }`}
            />
            <span className="absolute top-4 right-14 text-quiet font-mono text-[8px] tracking-[0.055em]">
              {menuOpen ? 'CLOSE' : 'MENU'}
            </span>
          </button>
        </div>
      </header>

      {/* Fullscreen Mobile / Flyout Navigation Drawer */}
      <aside
        ref={menuPanelRef}
        style={{ backgroundColor: '#0f0e0c' }}
        className={`fixed z-[80] inset-0 flex overflow-y-auto flex-col justify-between pt-30 max-sm:pt-24 pb-12 max-sm:pb-7 px-[clamp(24px,6.4vw,105px)] max-sm:px-6 bg-[#0f0e0c] backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.77,0,0.17,1)] ${
          menuOpen ? 'translate-x-0 visible opacity-100' : 'translate-x-full invisible opacity-0 pointer-events-none'
        }`}
        id="site-menu"
        aria-label="Expanded navigation"
        aria-hidden={!menuOpen}
      >
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_85%_22%,rgba(243,109,69,0.18),transparent_50%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-30 bg-[size:72px_72px] bg-[linear-gradient(rgba(238,234,229,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(238,234,229,0.03)_1px,transparent_1px)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center justify-between text-quiet font-mono text-[9px] max-sm:text-[7px] tracking-[0.11em]">
          <span>MENU / 01—05</span>
          <span>JOSEPH AKINWOLE®</span>
        </div>

        <nav className="relative z-10 flex w-full max-w-[880px] my-auto max-sm:my-14 flex-col" aria-label="Expanded navigation links">
          {navigation.map(({ id, label }, index) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={closeMenu}
              className="group flex w-full max-w-[750px] items-center gap-6 max-sm:gap-4 py-2.5 border-b border-white/13 text-[clamp(44px,7.5vw,100px)] max-sm:text-[clamp(43px,12vw,71px)] font-medium leading-[1.15] tracking-[-0.075em] transition-all duration-300 hover:pl-3 hover:text-ember-soft"
            >
              <span className="self-start pt-4 max-sm:pt-3 text-quiet font-mono text-[9px] max-sm:text-[8px] tracking-[0.11em]">
                0{index + 1}
              </span>
              {label}
              <Arrow className="w-[clamp(21px,3vw,38px)] ml-auto text-ember" />
            </a>
          ))}
        </nav>

        <div className="relative z-10 flex items-end justify-between text-quiet font-mono text-[9px] tracking-[0.11em]">
          <div className="flex flex-col gap-2.5">
            <span>HAVE SOMETHING IN MIND?</span>
            <a
              href={`mailto:${EMAIL}`}
              onClick={closeMenu}
              className="group flex items-center gap-3.5 text-[17px] max-sm:text-[13px] text-paper font-sans hover:text-ember-soft transition-colors"
            >
              Say hello <Arrow className="w-4" />
            </a>
          </div>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="pb-1 hover:text-ember-soft transition-colors">
            GITHUB ↗
          </a>
        </div>
      </aside>

      {/* Floating Interactive CTA Button */}
      <a
        className={`group fixed z-[45] right-7 max-sm:right-3.5 bottom-6 max-sm:bottom-3.5 inline-flex items-center gap-2.5 py-3 max-sm:py-2.5 px-3.5 border border-white/13 bg-[#121110]/80 backdrop-blur-md text-[#eee8e0] font-mono text-[8px] tracking-[0.08em] transition-all duration-300 hover:border-ember hover:bg-[#201814] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ember-soft ${
          activeSection === 'home'
            ? 'max-md:opacity-0 max-md:pointer-events-none max-md:translate-y-4'
            : 'opacity-100 translate-y-0'
        }`}
        href="#contact"
        data-cursor="TALK"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#b4d579] shadow-[0_0_12px_rgba(180,213,121,0.55)]" />
        LET’S TALK
        <Arrow className="w-3 text-ember-soft" />
      </a>
    </>
  );
}
