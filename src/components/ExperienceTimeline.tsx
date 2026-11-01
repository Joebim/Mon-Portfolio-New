'use client';

import { useRef, useState, useEffect } from 'react';
import { Reveal } from './Reveal';

interface ExperienceItem {
  company: string;
  role: string;
  dates: string;
  location: string;
  type: string;
  summary: string;
  highlights: string[];
  technologies: string[];
}

const enrichedExperience: ExperienceItem[] = [
  {
    company: 'Precise Financial Systems',
    role: 'Software Developer',
    dates: '2025 — Present',
    location: 'Yaba, Lagos · Hybrid',
    type: 'Fintech & Enterprise Systems',
    summary:
      'Architecting core modules for enterprise financial management software deployed across commercial banks and public sector institutions. Building high-performance server-rendered component systems for transaction ledgers and multi-level approval workflows while scaling secure API infrastructure.',
    highlights: [
      '30% Manual Processing Reduction',
      '99.9% Production Uptime',
      'Thousands of Daily Bank Transactions',
      'Core Financial Module Architecture'
    ],
    technologies: ['TypeScript', 'React / SSR', 'Node.js', 'Financial APIs', 'High-Availability Arch']
  },
  {
    company: 'Glimere',
    role: 'Fullstack Engineer',
    dates: '2023 — 2025',
    location: 'Akure, Ondo State',
    type: 'Product Studio & Interactive Web',
    summary:
      'Spearheaded client-facing web interfaces and design system architecture across multiple customer-facing products. Optimized 3D assets and graphics pipelines to accelerate initial page load times by a fifth, while maintaining backend application services.',
    highlights: [
      '20% Faster Asset Load Times',
      '50% Fewer Bug Reports',
      'Design System Lead across 3+ Projects',
      'Full-Stack Node.js Integration'
    ],
    technologies: ['React', 'TypeScript', 'Three.js / 3D', 'Node.js', 'MongoDB', 'Git Workflows']
  },
  {
    company: 'HNG',
    role: 'Frontend Developer Intern',
    dates: '2024',
    location: 'Remote · Intensive Fellowship',
    type: 'AI Platforms & Gamified Web',
    summary:
      'Engineered high-performance web applications including the DevLinks social sharing interface and core UI interactions for Delve, an AI-powered 3D language learning game. Authored standardized component boilerplates and resolved 200+ edge-case interface issues.',
    highlights: [
      '25% Increase in User Engagement',
      'Delve 3D AI Platform Interfaces',
      '200+ Resolved Stability & UI Bugs',
      '30% Faster Development Cycles'
    ],
    technologies: ['React', 'Next.js', 'Tailwind CSS', 'Three.js / 3D', 'State Architecture']
  },
  {
    company: 'Core Outreach Services (CORS)',
    role: 'Frontend Developer',
    dates: '2022 — 2023',
    location: 'Dallas, Texas · Remote',
    type: 'Digital Brand & Service Portals',
    summary:
      'Developed and maintained features across more than eight live client web platforms. Transformed complex design mockups into accessible, cross-browser interactive interfaces with responsive fidelity across desktop and mobile devices.',
    highlights: [
      '8+ Deployed Production Projects',
      '15% Growth in User Retention',
      'WCAG Accessibility Auditing',
      'Cross-Browser Rendering Fidelity'
    ],
    technologies: ['React', 'Redux', 'Material UI', 'Sass', 'Responsive UI']
  },
  {
    company: 'JDLab',
    role: 'Frontend Developer',
    dates: '2021 — 2023',
    location: 'Minna, Niger State',
    type: 'EdTech & Portal Infrastructure',
    summary:
      'Architected intuitive student portal flows and secure payment processing pipelines that drove a 30% first-year revenue expansion. Partnered closely with backend engineering teams to optimize async API communication and reduce checkout friction.',
    highlights: [
      '30% First-Year Revenue Growth',
      'Automated Tuition Payment Flow',
      'Optimized API & State Lifecycle',
      'AJAX & Resource Management'
    ],
    technologies: ['React', 'JavaScript', 'Redux', 'RESTful APIs', 'Payment Gateways']
  }
];

export function ExperienceTimeline({ experiences }: { experiences?: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Merge live API / Firestore experiences with enriched presentation data
  const timelineItems: ExperienceItem[] = (experiences && experiences.length > 0)
    ? experiences.map((exp: any, i: number) => {
        const enriched = enrichedExperience.find(
          (e) => e.company.toLowerCase() === exp.company.toLowerCase()
        ) || enrichedExperience[i];

        return {
          company: exp.company,
          role: exp.role,
          dates: exp.dates,
          location: exp.location,
          type: enriched?.type || 'Engineering & Development',
          summary: exp.achievements?.[0] || enriched?.summary || 'Designed and implemented core software features.',
          highlights: (exp.achievements && exp.achievements.length > 1)
            ? exp.achievements.slice(1)
            : (enriched?.highlights || exp.achievements || []),
          technologies: enriched?.technologies || ['TypeScript', 'React', 'Node.js', 'REST APIs'],
        };
      })
    : enrichedExperience;

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate progress starting when container enters lower half of viewport
      const startTrigger = viewportHeight * 0.75;
      const endTrigger = viewportHeight * 0.25;
      const totalDistance = rect.height;
      const scrolledPast = startTrigger - rect.top;

      const progress = Math.min(1, Math.max(0, scrolledPast / (totalDistance + startTrigger - endTrigger)));
      setScrollProgress(progress);

      // Determine active milestone based on element proximity
      const itemElements = el.querySelectorAll<HTMLElement>('[data-timeline-item]');
      let currentActive = 0;
      itemElements.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();
        if (itemRect.top <= viewportHeight * 0.55) {
          currentActive = index;
        }
      });
      setActiveIndex(currentActive);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* =========================================================================
          DESKTOP TIMELINE TRACK (md+)
          Connects the years on the left to each milestone card with flowing pulse
          ========================================================================= */}
      <div className="hidden md:block absolute left-[240px] lg:left-[280px] top-6 bottom-14 w-[1px] pointer-events-none z-10">
        {/* Background track line */}
        <div className="absolute inset-0 w-full bg-white/[0.09]" />

        {/* Dynamic scroll-progress glowing fill line */}
        <div
          className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#f36d45] via-[#ffb490] to-white transition-[height] duration-150 ease-out shadow-[0_0_12px_rgba(243,109,69,0.85)]"
          style={{ height: `${scrollProgress * 100}%` }}
        >
          {/* Sharp glowing diamond bead cursor at tip */}
          {scrollProgress > 0.01 && (
            <div className="absolute -bottom-1 -left-[3.5px] w-2 h-2 rotate-45 bg-[#f36d45] shadow-[0_0_10px_#f36d45,0_0_20px_rgba(243,109,69,0.8)]" />
          )}
        </div>

        {/* Flowing animated glowing beam streaming continuously down the connecting line */}
        <div className="absolute inset-0 overflow-hidden w-full">
          <div className="absolute left-0 w-full h-48 bg-gradient-to-b from-transparent via-[#f36d45] via-white to-transparent animate-timeline-beam" />
        </div>
      </div>

      {/* =========================================================================
          MOBILE TIMELINE TRACK (< md)
          Sits along the left gutter connecting all milestones
          ========================================================================= */}
      <div className="md:hidden absolute left-3 xs:left-4 top-6 bottom-10 w-[1px] pointer-events-none z-10">
        {/* Background track line */}
        <div className="absolute inset-0 w-full bg-white/[0.09]" />

        {/* Dynamic scroll-progress glowing fill line */}
        <div
          className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#f36d45] via-[#ffb490] to-white transition-[height] duration-150 ease-out shadow-[0_0_10px_rgba(243,109,69,0.8)]"
          style={{ height: `${scrollProgress * 100}%` }}
        >
          {scrollProgress > 0.01 && (
            <div className="absolute -bottom-1 -left-[3px] w-1.5 h-1.5 rotate-45 bg-[#f36d45] shadow-[0_0_8px_#f36d45]" />
          )}
        </div>

        {/* Flowing animated glowing beam on mobile */}
        <div className="absolute inset-0 overflow-hidden w-full">
          <div className="absolute left-0 w-full h-36 bg-gradient-to-b from-transparent via-[#f36d45] to-transparent animate-timeline-beam" />
        </div>
      </div>

      {/* Timeline entries list */}
      <div className="flex flex-col gap-10 md:gap-14">
        {timelineItems.map((item, index) => {
          const isItemActive = index <= activeIndex;
          const isCurrentFocus = index === activeIndex;
          const indexNum = String(index + 1).padStart(2, '0');

          return (
            <div
              key={`${item.company}-${item.dates}`}
              data-timeline-item
              className="relative grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] gap-6 md:gap-12 items-start"
            >
              {/* ===================================================================
                  DESKTOP LEFT COLUMN: Dates Badge + Location + Sharp Milestone Node
                  =================================================================== */}
              <div className="hidden md:flex flex-col items-start pr-8 relative">
                {/* Sharp Diamond Milestone Node on the timeline track */}
                <div
                  className={`absolute right-[-6px] top-4 w-3 h-3 rotate-45 border transition-all duration-400 z-20 flex items-center justify-center ${
                    isItemActive
                      ? 'border-[#f36d45] bg-[#1a0f0b] shadow-[0_0_14px_rgba(243,109,69,0.9)]'
                      : 'border-white/20 bg-[#0b0b0b]'
                  } ${isCurrentFocus ? 'scale-125 ring-2 ring-[#f36d45]/40' : ''}`}
                  aria-hidden="true"
                >
                  <div
                    className={`w-1 h-1 transition-colors duration-300 ${
                      isItemActive ? 'bg-[#f36d45]' : 'bg-white/30'
                    }`}
                  />
                </div>

                {/* Sharp Date range badge */}
                <span
                  className={`font-mono text-xs uppercase tracking-[0.1em] font-semibold py-1.5 px-3 border rounded-none transition-all duration-300 ${
                    isItemActive
                      ? 'text-[#ffb490] bg-[#1a1411] border-[#f36d45]/40 shadow-[0_0_15px_rgba(243,109,69,0.12)]'
                      : 'text-[#8e8780] bg-[#121110] border-white/10'
                  }`}
                >
                  {item.dates}
                </span>

                {/* Location with technical marker */}
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#7a746e] mt-2.5 flex items-center gap-1.5">
                  <span className={`w-1 h-1 ${isItemActive ? 'bg-[#f36d45]' : 'bg-white/20'}`} />
                  {item.location}
                </span>

                {/* Sector / Domain specification */}
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#9b9289] mt-1 text-left">
                  {item.type}
                </span>
              </div>

              {/* ===================================================================
                  MOBILE SHARP MILESTONE NODE
                  =================================================================== */}
              <div
                className={`md:hidden absolute left-[7px] xs:left-[11px] top-4 w-2.5 h-2.5 rotate-45 border transition-all duration-400 z-20 flex items-center justify-center ${
                  isItemActive
                    ? 'border-[#f36d45] bg-[#1a0f0b] shadow-[0_0_10px_rgba(243,109,69,0.9)]'
                    : 'border-white/20 bg-[#0b0b0b]'
                } ${isCurrentFocus ? 'scale-125 ring-2 ring-[#f36d45]/40' : ''}`}
                aria-hidden="true"
              >
                <div
                  className={`w-0.5 h-0.5 transition-colors duration-300 ${
                    isItemActive ? 'bg-[#f36d45]' : 'bg-white/30'
                  }`}
                />
              </div>

              {/* ===================================================================
                  REDESIGNED EXPERIENCE CARD:
                  - Sharp corners (rounded-none)
                  - Architectural editorial aesthetics
                  - Precision borders and corner crosshair accents
                  - No bullet points (clean narrative + structured impact matrix)
                  =================================================================== */}
              <div className="pl-7 xs:pl-9 md:pl-0">
                <Reveal delay={(index % 3) * 60}>
                  <article
                    className={`relative p-6 sm:p-7 md:p-8 rounded-none border transition-all duration-300 group ${
                      isItemActive
                        ? 'border-white/15 bg-[#121110] shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:border-[#f36d45]/45 hover:bg-[#151312]'
                        : 'border-white/10 bg-[#0f0e0d] hover:border-white/20 hover:bg-[#131110]'
                    }`}
                  >
                    {/* Top corner crosshair accents */}
                    <div
                      className="absolute -top-px -left-px w-2.5 h-2.5 border-t border-l border-ember opacity-60 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -top-px -right-px w-2.5 h-2.5 border-t border-r border-white/25 group-hover:border-ember/60 transition-colors"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -bottom-px -left-px w-2.5 h-2.5 border-b border-l border-white/25 group-hover:border-ember/60 transition-colors"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b border-r border-ember opacity-60 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />

                    {/* Top ambient ember glow line */}
                    <div
                      className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#f36d45]/40 to-transparent transition-opacity duration-300 ${
                        isItemActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      aria-hidden="true"
                    />

                    {/* Technical Meta Header Bar */}
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.08] text-[9px] font-mono tracking-[0.14em] uppercase text-[#88817a]">
                      <div className="flex items-center gap-2">
                        <span className="text-ember font-bold">[{indexNum}]</span>
                        <span className="hidden sm:inline text-[#66605a]">/</span>
                        <span className="hidden sm:inline text-[#9e968f]">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-ember/60 group-hover:bg-ember transition-colors" />
                        <span className="text-[#a8a19a]">{item.location}</span>
                      </div>
                    </div>

                    {/* Mobile-only date indicator */}
                    <div className="md:hidden flex items-center gap-2 mb-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] font-semibold py-1 px-2.5 border border-[#f36d45]/30 bg-[#1a1411] text-[#ffb490] rounded-none">
                        {item.dates}
                      </span>
                    </div>

                    {/* Company and Role Header */}
                    <div className="mb-4">
                      <h3 className="m-0 text-2xl sm:text-[27px] font-medium tracking-[-0.04em] text-[#eeeae5] group-hover:text-white transition-colors">
                        {item.company}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-sm sm:text-[15px] font-mono font-medium text-[#f36d45] tracking-[0.02em]">
                          {item.role}
                        </span>
                        <span className="text-white/20 font-mono text-xs">/</span>
                        <span className="text-[#968e86] font-mono text-[10px] uppercase tracking-wider">
                          Full-Cycle Engineering
                        </span>
                      </div>
                    </div>

                    {/* Narrative Summary (No bullet points) */}
                    <p className="text-[#c2bab2] text-[13px] sm:text-[13.5px] leading-[1.8] font-normal tracking-[-0.01em] mb-6">
                      {item.summary}
                    </p>

                    {/* Key Impact & Deliverables - Sharp Architectural Matrix */}
                    <div className="mb-6">
                      <div className="text-[8.5px] font-mono uppercase tracking-[0.18em] text-[#8e8780] mb-3 flex items-center gap-2">
                        <span className="text-ember">✦</span>
                        KEY DELIVERABLES & MEASURED IMPACT
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.highlights.map((highlight) => (
                          <div
                            key={highlight}
                            className="flex items-start gap-2.5 p-2.5 px-3 border border-white/[0.08] bg-white/[0.015] group-hover:border-white/15 group-hover:bg-white/[0.03] transition-colors rounded-none"
                          >
                            <span className="text-[#f36d45] text-xs leading-tight flex-none mt-0.5">▸</span>
                            <span className="text-[#d8d0c7] text-[11.5px] sm:text-xs font-mono tracking-tight leading-snug">
                              {highlight}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technology Stack Strip - Sharp Technical Chips */}
                    <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-[8.5px] font-mono uppercase tracking-[0.14em] text-[#756e68] mr-1.5 flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#f36d45]" />
                        STACK:
                      </span>
                      {item.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="px-2.5 py-1 rounded-none bg-white/[0.025] border border-white/[0.08] text-[#a09890] font-mono text-[9px] uppercase tracking-[0.08em] group-hover:border-white/15 transition-colors"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </article>
                </Reveal>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ExperienceTimeline;

