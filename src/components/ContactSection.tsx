'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import josephPortrait from '../../public/joseph-portrait.png';
import { josephPortraitBlurDataURL } from '../lib/image-placeholders';
import { EMAIL, GITHUB_URL, portfolio } from '../data';
import { Arrow, ProjectLabel, SocialLinks } from './SiteNavigation';
import { Reveal } from './Reveal';
import { TiltCard } from './TiltCard';
import { BorderGlow } from './BorderGlow';

const GradientWaves = dynamic(() => import('./GradientWaves'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#0d0c0b]" />,
});

export function ContactSection() {
  return (
    <section
      className="relative min-h-[640px] max-sm:min-h-0 overflow-hidden border-t border-white/13 bg-[#0d0c0b]"
      id="contact"
      aria-labelledby="contact-title"
    >
      {/* Dynamic WebGL GradientWaves background */}
      <div className="absolute inset-0 z-0 pointer-events-auto opacity-75">
        <GradientWaves
          horizonColor="#150d1e"
          waveColor="#6e2d63"
          crestColor="#f36d45"
          backgroundColor="#0b0b0b"
          speed={0.35}
          amplitude={2.3}
          relief={1}
          lightAngle={120}
          mouseInteraction
          swellOnClick
          lightMode={false}
          waveScale={0.65}
          waveRatio={0.9}
          swell={32}
          turbulence={18}
          tilt={64}
          zoom={1}
          height={5.5}
          fogDepth={15}
          sheen={0.25}
          brightness={1.05}
          opacity={0.85}
          grain={0.16}
          quality="medium"
          intro
          parallaxStrength={0.45}
          mouseStrength={0.55}
          paused={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-transparent to-[#0b0b0b]/75 pointer-events-none" />
      </div>

      <div className="relative z-10 grid grid-cols-[1.1fr_0.9fr] max-lg:grid-cols-1 items-center gap-12 lg:gap-16 py-25 max-sm:pt-20 max-sm:pb-18 w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6">
        <Reveal className="max-w-[680px]">
          <ProjectLabel>HAVE A GOOD ONE IN MIND? / 05</ProjectLabel>
          <h2
            id="contact-title"
            className="mt-6 text-[clamp(73px,10vw,138px)] max-sm:text-[clamp(73px,15.5vw,101px)] font-medium leading-[0.84] tracking-[-0.103em] -ml-[0.05em]"
          >
            Let’s make<br />
            <span className="text-[#a79c91]">
              it matter<span className="text-ember-soft">.</span>
            </span>
          </h2>
          <p className="max-w-[375px] max-sm:max-w-[325px] my-6 text-[#b0a69c] text-[13px] max-sm:text-xs leading-[1.8]">
            Have a thoughtful project, a tricky interface, or just want to say hello? I’d like to hear about it.
          </p>
          <a
            className="group inline-flex min-w-[215px] items-center justify-between gap-8 py-3.5 px-4 border border-ember/70 text-[#f2ebe3] font-mono text-[8px] tracking-[0.1em] transition-all duration-300 hover:border-ember hover:bg-ember hover:text-ink focus-visible:outline-2 focus-visible:outline-ember-soft"
            href={`mailto:${EMAIL}?subject=Hello%20Joseph`}
          >
            <span>EMAIL JOSEPH</span>
            <Arrow className="text-ember-soft group-hover:text-ink" />
          </a>
          <a
            className="block mt-4 text-[#9e968f] font-mono text-[8px] tracking-[0.08em] hover:text-paper transition-colors"
            href={`tel:${portfolio.contact.phone.replace(/\s+/g, '')}`}
          >
            OR CALL {portfolio.contact.phone}
          </a>
          <SocialLinks />
        </Reveal>

        <Reveal delay={130} className="flex items-center justify-center lg:justify-end max-sm:pt-8 max-sm:border-t max-sm:border-white/13">
          <TiltCard maxTilt={10} perspective={1100} className="w-full max-w-[480px] lg:max-w-[520px] mx-auto lg:mr-0">
            <BorderGlow
              edgeSensitivity={28}
              glowColor="20 90% 65%"
              backgroundColor="#14110f"
              borderRadius={24}
              glowRadius={36}
              glowIntensity={1.25}
              coneSpread={28}
              colors={['#f36d45', '#ffb490', '#d97706']}
              className="w-full rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.85),0_0_60px_rgba(243,109,69,0.22)]"
            >
              <div className="relative w-full aspect-[4/5] sm:aspect-square rounded-[inherit] overflow-hidden group">
                <div
                  className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_35%,rgba(243,109,69,0.32),transparent_65%)]"
                  aria-hidden="true"
                />

                <div
                  className="absolute inset-0 pointer-events-none opacity-25 bg-[size:28px_28px] bg-[linear-gradient(rgba(238,234,229,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(238,234,229,0.05)_1px,transparent_1px)]"
                  aria-hidden="true"
                />

                {/* Joseph's Portrait Cutout */}
                <Image
                  src={josephPortrait}
                  placeholder="blur"
                  blurDataURL={josephPortraitBlurDataURL}
                  alt="Joseph Akinwole — Full Stack Engineer"
                  className="relative z-10 w-full h-full object-cover object-top sm:object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  width={2351}
                  height={2351}
                  sizes="(max-width: 640px) 90vw, 40vw"
                />

                <div
                  className="absolute z-20 inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/75 to-transparent pointer-events-none"
                  aria-hidden="true"
                />

                <div className="absolute z-30 top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b0b0b]/85 border border-white/15 backdrop-blur-md shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-[#b4d579] shadow-[0_0_10px_#b4d579] animate-pulse" />
                  <span className="font-mono text-[8px] tracking-[0.14em] text-[#d2c9c1] uppercase font-medium">AVAILABLE FOR WORK</span>
                </div>

                <div className="absolute z-30 top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-[#0b0b0b]/85 border border-white/15 backdrop-blur-md shadow-lg">
                  <img src="/joseph-logo.svg" alt="Joseph emblem" className="w-4 h-4 object-contain" width={16} height={16} />
                </div>

                <div className="absolute z-30 bottom-5 inset-x-5 flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.14em] uppercase text-ember-soft font-semibold">
                      JOSEPH AKINWOLE
                    </span>
                    <span className="font-mono text-[7px] sm:text-[8px] text-[#9e9690] tracking-wider">
                      FULL STACK ENGINEER
                    </span>
                  </div>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0b0b0b]/85 border border-white/15 backdrop-blur-md font-mono text-[8px] tracking-wider text-[#d1c9c1] hover:text-ember-soft hover:border-ember/50 transition-all shadow-md"
                  >
                    GITHUB <Arrow className="w-3 text-ember group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                  </a>
                </div>
              </div>
            </BorderGlow>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
