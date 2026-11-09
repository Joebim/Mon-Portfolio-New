'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { EMAIL, GITHUB_URL, professionalLinks } from '../data';
import { StaggeredMenu } from './StaggeredMenu';

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

export function SocialLinks({
  className = '',
  links = professionalLinks,
}: {
  className?: string;
  links?: any[];
}) {
  return (
    <div className={`flex flex-wrap gap-2.5 max-sm:gap-1.5 mt-6 ${className}`.trim()}>
      {(links || []).map((link) => (
        <a
          key={link.label || link.platform || link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-2.5 max-sm:py-1.5 max-sm:px-2 border border-white/15 text-[#d1c9c1] font-mono text-[7px] max-sm:text-[6px] tracking-[0.08em] transition-colors duration-200 hover:border-ember hover:bg-ember/10 hover:text-ember-soft focus-visible:outline-2 focus-visible:outline-ember-soft"
        >
          {link.short || link.username || link.label || link.platform} ↗
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
  { id: 'writing', label: 'Writing' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
];

export function SiteNavigation() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    if (isAdmin) return;

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
  }, [isAdmin]);

  if (isAdmin) return null;

  const getLink = (id: string) => (pathname === '/' ? `#${id}` : `/#${id}`);

  const menuItems = [
    { label: 'Home', ariaLabel: 'Go to home section', link: getLink('home') },
    { label: 'Selected work', ariaLabel: 'View selected work', link: getLink('work') },
    { label: 'About', ariaLabel: 'Learn about Joseph', link: getLink('about') },
    { label: 'Writing', ariaLabel: 'Read thoughts and articles', link: getLink('writing') },
    { label: 'Experience', ariaLabel: 'View career history', link: getLink('experience') },
    { label: 'Contact', ariaLabel: 'Get in touch', link: getLink('contact') },
  ];

  const socialItems = [
    { label: 'GitHub', link: GITHUB_URL },
    { label: 'LinkedIn', link: 'https://linkedin.com/in/joseph-akinwole' },
    { label: 'DEV.to', link: 'https://dev.to/joebim' },
    { label: 'Twitter / X', link: 'https://x.com/joebim_' },
    { label: 'Email', link: `mailto:${EMAIL}` },
  ];

  const desktopNav = (
    <nav className="flex max-sm:hidden items-center gap-[clamp(23px,3vw,48px)]" aria-label="Main navigation">
      {navigation.slice(1).map(({ id, label }) => {
        const isActive = activeSection === id;
        return (
          <a
            key={id}
            data-cursor={id === 'work' ? 'EXPLORE' : id === 'about' ? 'ABOUT' : id === 'writing' ? 'WRITING' : id === 'experience' ? 'CAREER' : 'TALK'}
            className={`relative py-2.5 font-mono text-[10px] tracking-[0.055em] uppercase transition-colors duration-250 hover:text-paper after:absolute after:inset-x-0 after:bottom-1 after:h-[1px] after:bg-ember after:origin-left after:transition-transform after:duration-300 ${
              isActive ? 'text-paper after:scale-x-100' : 'text-[#b6b1ac] after:scale-x-0 hover:after:scale-x-100'
            }`}
            href={getLink(id)}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );

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

      {/* Staggered Navigation Side Menu */}
      <StaggeredMenu
        isFixed
        position="right"
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={true}
        colors={['#B497CF', '#5227FF']}
        accentColor="#5227FF"
        menuButtonColor="#ffffff"
        openMenuButtonColor="#000000"
        changeMenuColorOnOpen={true}
        customLogo={<BrandMark />}
        headerCenter={desktopNav}
      />

      {/* Floating Interactive CTA Button */}
      <a
        className={`group fixed z-[45] right-7 max-sm:right-3.5 bottom-6 max-sm:bottom-3.5 inline-flex items-center gap-2.5 py-3 max-sm:py-2.5 px-3.5 border border-white/13 bg-[#121110]/80 backdrop-blur-md text-[#eee8e0] font-mono text-[8px] tracking-[0.08em] transition-all duration-300 hover:border-ember hover:bg-[#201814] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ember-soft ${
          activeSection === 'home'
            ? 'max-md:opacity-0 max-md:pointer-events-none max-md:translate-y-4'
            : 'opacity-100 translate-y-0'
        }`}
        href={getLink('contact')}
        data-cursor="TALK"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#b4d579] shadow-[0_0_12px_rgba(180,213,121,0.55)]" />
        LET’S TALK
        <Arrow className="w-3 text-ember-soft" />
      </a>
    </>
  );
}
