'use client';

import { useState, useRef, type MouseEvent } from 'react';
import { projects } from '../data';

interface ShowcaseItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  metric: string;
  metricLabel: string;
  stack: string[];
  accentColor: string;
  link: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'apex',
    badge: '01 / FINTECH INFRA',
    title: 'Apex Banking',
    subtitle: 'Secure Multi-Currency Web & Mobile Financial Core',
    metric: '99.98%',
    metricLabel: 'TRANSACTION SLA',
    stack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    accentColor: '#f36d45',
    link: '#work',
  },
  {
    id: 'pulse',
    badge: '02 / REALTIME TELEMETRY',
    title: 'Pulse Health',
    subtitle: 'High-Density Patient Telemetry & Critical Monitoring',
    metric: '<45ms',
    metricLabel: 'SOCKET LATENCY',
    stack: ['WebSockets', 'Next.js', 'Redis', 'Tailwind'],
    accentColor: '#ffb490',
    link: '#work',
  },
  {
    id: 'devlinks',
    badge: '03 / DESIGN SYSTEMS',
    title: 'DevLinks Suite',
    subtitle: 'Editorial Developer Identity & Link Orchestration',
    metric: '100/100',
    metricLabel: 'LIGHTHOUSE A11Y',
    stack: ['React 19', 'CSS Modules', 'GraphQL'],
    accentColor: '#b4d579',
    link: '#work',
  },
];

export function HeroShowcaseDeck() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, opacity: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeItem = SHOWCASE_ITEMS[activeIndex];

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rx = ((y - centerY) / centerY) * -6;
    const ry = ((x - centerX) / centerX) * 8;

    setTilt({ rx, ry });
    setSpotlight({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setSpotlight((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col gap-4 p-5 sm:p-6 rounded border border-[rgba(238,234,229,0.16)] bg-[#12100e]/90 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:border-[#f36d45]/50 hover:shadow-[0_28px_70px_rgba(0,0,0,0.7),0_0_35px_rgba(243,109,69,0.1)]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
        transition: 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      {/* Ambient Spotlight Glow tracking cursor */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit] transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, rgba(243, 109, 69, 0.18), transparent 65%)`,
          opacity: spotlight.opacity,
        }}
        aria-hidden="true"
      />

      {/* Header bar of the Showcase Stage */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[rgba(238,234,229,0.1)]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45] shadow-[0_0_10px_#f36d45]" />
          <span className="font-mono text-[8px] tracking-[0.12em] text-[#9f9791] uppercase">
            FEATURED SYSTEMS ARCHITECTURE
          </span>
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Featured work selector">
          {SHOWCASE_ITEMS.map((item, idx) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={activeIndex === idx}
              aria-controls={`showcase-panel-${item.id}`}
              className={`px-2 py-0.5 rounded-sm font-mono text-[8px] tracking-wider transition-colors cursor-pointer border ${
                activeIndex === idx
                  ? 'bg-[#f36d45]/15 border-[#f36d45] text-[#ffb490]'
                  : 'bg-transparent border-[rgba(238,234,229,0.12)] text-[#8c857f] hover:text-[#eeeae5] hover:border-[#f36d45]/40'
              }`}
              onClick={() => setActiveIndex(idx)}
            >
              0{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive System Preview Card */}
      <a
        href={activeItem.link}
        className="relative z-10 flex flex-col gap-3.5 p-4 rounded bg-white/[0.025] border border-[rgba(238,234,229,0.08)] hover:bg-white/[0.045] hover:border-[#f36d45]/35 hover:-translate-y-0.5 transition-all duration-200 no-underline group"
        id={`showcase-panel-${activeItem.id}`}
        aria-label={`View ${activeItem.title} project`}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] tracking-[0.12em] font-medium text-[#ffb490]">
            {activeItem.badge}
          </span>
          <span className="font-mono text-[8px] tracking-wider text-[#a8a19b] group-hover:text-[#f36d45] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200">
            EXPLORE ↗
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-lg sm:text-xl font-semibold tracking-tight text-[#f2ede8]">
            {activeItem.title}
          </h3>
          <p className="m-0 text-[11px] leading-relaxed text-[#9b948e]">
            {activeItem.subtitle}
          </p>
        </div>

        {/* Live architectural telemetry metric */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded bg-[#0b0b0b]/60 border border-[rgba(238,234,229,0.06)]">
          <div className="flex flex-col">
            <strong className="text-base font-bold tracking-tight text-[#eeeae5]">
              {activeItem.metric}
            </strong>
            <small className="font-mono text-[7px] tracking-widest uppercase text-[#ffb490]">
              {activeItem.metricLabel}
            </small>
          </div>
          <div className="flex items-end gap-1 h-6 w-14" aria-hidden="true">
            <span className="w-1.5 rounded-xs bg-[#f36d45] opacity-75 group-hover:opacity-100 transition-opacity" style={{ height: '42%' }} />
            <span className="w-1.5 rounded-xs bg-[#f36d45] opacity-75 group-hover:opacity-100 transition-opacity" style={{ height: '68%' }} />
            <span className="w-1.5 rounded-xs bg-[#f36d45] opacity-75 group-hover:opacity-100 transition-opacity" style={{ height: '55%' }} />
            <span className="w-1.5 rounded-xs bg-[#f36d45] opacity-75 group-hover:opacity-100 transition-opacity" style={{ height: '82%' }} />
            <span className="w-1.5 rounded-xs bg-[#f36d45] opacity-75 group-hover:opacity-100 transition-opacity" style={{ height: '70%' }} />
            <span className="w-1.5 rounded-xs bg-[#f36d45] opacity-75 group-hover:opacity-100 transition-opacity" style={{ height: '94%' }} />
            <span className="w-1.5 rounded-xs bg-[#f36d45] opacity-75 group-hover:opacity-100 transition-opacity" style={{ height: '88%' }} />
          </div>
        </div>

        {/* Stack tags */}
        <div className="flex flex-wrap gap-1.5">
          {activeItem.stack.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded bg-white/[0.04] border border-[rgba(238,234,229,0.08)] font-mono text-[7px] tracking-wide text-[#bcb4ad]"
            >
              {tag}
            </span>
          ))}
        </div>
      </a>

      {/* Interactive Quick-Jump Link */}
      <div className="relative z-10 flex items-center justify-between pt-1.5 font-mono text-[7px] tracking-[0.11em] text-[#7b7570]">
        <span>JOSEPH AKINWOLE · 2026 ARCHIVE</span>
        <a href="#work" className="text-[#eeeae5] hover:text-[#ffb490] transition-colors">
          ALL {projects.length} PROJECTS ↗
        </a>
      </div>
    </div>
  );
}
