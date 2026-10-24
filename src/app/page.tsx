import { Hero } from '../components/Hero';
import { ProjectCard } from '../components/ProjectCard';
import { Reveal } from '../components/Reveal';
import { BorderGlow } from '../components/BorderGlow';
import { ExperienceTimeline } from '../components/ExperienceTimeline';
import { ContactSection } from '../components/ContactSection';
import { Arrow, BrandMark, ProjectLabel } from '../components/SiteNavigation';
import { EMAIL, GITHUB_URL, portfolio, projects, skillGroups, smallWorks, softSkills } from '../data';

export default function HomePage() {
  return (
    <>
      <main id="main">
        {/* Hero Section */}
        <Hero />

        {/* Selected Work Section */}
        <section
          className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-[clamp(107px,13.7vw,194px)] max-sm:pt-26 pb-36 max-sm:pb-25"
          id="work"
          aria-labelledby="work-title"
        >
          <div className="grid grid-cols-[1.15fr_0.75fr] max-sm:grid-cols-1 items-end max-sm:items-start gap-[4vw] max-sm:gap-6 mb-[clamp(51px,7vw,88px)] max-sm:mb-10">
            <Reveal>
              <ProjectLabel>THE GOOD STUFF / 01—{String(projects.length).padStart(2, '0')}</ProjectLabel>
              <h2
                id="work-title"
                className="mt-7 max-sm:mt-5 text-[clamp(69px,9.5vw,136px)] max-sm:text-[clamp(68px,15vw,98px)] font-medium leading-[0.84] tracking-[-0.103em] -ml-[0.05em]"
              >
                Selected<br />
                <span className="text-[#8e8883]">
                  work<span className="text-ember-soft">.</span>
                </span>
              </h2>
            </Reveal>
            <Reveal delay={120} className="justify-self-end max-sm:justify-self-start w-full max-w-[340px] max-sm:max-w-[355px] pb-2">
              <p className="max-w-[330px] m-0 mb-7 max-sm:mb-4.5 text-[#aaa39e] text-[13px] max-sm:text-xs leading-[1.8]">
                A few digital places I’ve helped bring to life. Built for people first, tuned down to the details.
              </p>
              <a
                className="group inline-flex items-center gap-3.5 text-paper font-mono text-[8px] tracking-[0.1em] transition-colors duration-200 hover:text-ember-soft"
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                MORE ON GITHUB <Arrow className="text-ember" />
              </a>
            </Reveal>
          </div>

          <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-x-7 gap-y-17 max-md:gap-y-14 max-sm:gap-y-11">
            {projects.map((project, index) => (
              <Reveal key={project.title} delay={(index % 2) * 110} className="min-w-0 h-full">
                <ProjectCard project={project} index={index} total={projects.length} />
              </Reveal>
            ))}
          </div>

          {/* Additional Little Things */}
          <Reveal className="mt-[clamp(102px,12vw,165px)] max-sm:mt-22 pt-7 border-t border-white/13">
            <div className="flex items-end max-sm:items-start justify-between max-sm:flex-col gap-10 max-sm:gap-3.5 mb-10 max-sm:mb-6">
              <div>
                <ProjectLabel>ALSO OUT IN THE WORLD</ProjectLabel>
                <h3 className="mt-4.5 text-[clamp(41px,5.1vw,67px)] max-sm:text-[47px] font-medium leading-[0.96] tracking-[-0.09em]">
                  More good<br />little things<span className="text-ember-soft">.</span>
                </h3>
              </div>
              <p className="max-w-[260px] max-sm:max-w-[285px] m-0 mb-1 text-[#9f9791] text-xs max-sm:text-[11px] leading-[1.8]">
                Some other corners of the web, built with equal curiosity.
              </p>
            </div>
            <div className="border-t border-white/13">
              {smallWorks.map((work, index) => (
                <a
                  key={work.name}
                  href={work.url ?? GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${work.url ? 'View source for' : 'View on GitHub for'} ${work.name}`}
                  className="group grid min-h-[76px] max-sm:min-h-[75px] grid-cols-[0.35fr_1.2fr_1.2fr_0.35fr_22px] max-sm:grid-cols-[25px_1fr_32px_16px] items-center gap-5 max-sm:gap-3 border-b border-white/13 transition-all duration-250 hover:px-2.5 hover:bg-white/[0.026]"
                >
                  <span className="text-[#9d958f] font-mono text-[8px]">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-sm max-sm:text-[13px] font-medium tracking-[-0.03em]">
                    {work.name}
                    <small className="block mt-1 text-[#8c8580] text-[9px] max-sm:text-[8px] font-normal tracking-normal">{work.note}</small>
                  </span>
                  <span className="text-[#938c87] font-mono text-[8px] max-sm:hidden">{work.stack}</span>
                  <span className="text-[#9d958f] font-mono text-[8px] max-sm:text-[7px] justify-self-end">{work.year}</span>
                  <Arrow className="w-3 text-ember" />
                </a>
              ))}
            </div>
          </Reveal>
        </section>

        {/* About Section */}
        <section
          className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-7 max-sm:pt-3 pb-[clamp(118px,14vw,190px)] max-sm:pb-28"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="grid grid-cols-[1fr_0.75fr] max-sm:grid-cols-1 items-start gap-[4vw] max-sm:gap-3.5 mb-14 max-sm:mb-9">
            <Reveal>
              <ProjectLabel>A LITTLE ABOUT ME / 02</ProjectLabel>
              <h2
                id="about-title"
                className="mt-7 max-sm:mt-5 text-[clamp(65px,8.1vw,112px)] max-sm:text-[clamp(62px,13vw,85px)] font-medium leading-[0.9] tracking-[-0.103em] -ml-[0.05em]"
              >
                Code with<br />
                <span className="text-[#9f9892]">character.</span>
              </h2>
            </Reveal>
            <Reveal delay={100} className="pt-6 max-sm:pt-0">
              <p className="text-paper text-[clamp(17px,1.8vw,22px)] max-sm:text-[18px] font-medium leading-[1.6] tracking-[-0.035em] mb-4">
                {portfolio.profile.aboutLead}
              </p>
              {portfolio.profile.aboutParagraphs.map((paragraph) => (
                <p key={paragraph} className="max-w-[410px] m-0 mb-4 text-[#a7a09a] text-xs max-sm:text-[11px] leading-[1.9]">
                  {paragraph}
                </p>
              ))}
              <a
                href={GITHUB_URL}
                className="group inline-flex items-center gap-3.5 text-paper font-mono text-[8px] tracking-[0.1em] transition-colors duration-200 hover:text-ember-soft mt-3"
                target="_blank"
                rel="noopener noreferrer"
              >
                A LITTLE MORE ABOUT MY CODE <Arrow className="text-ember" />
              </a>
            </Reveal>
          </div>

          <Reveal className="w-full">
            <BorderGlow
              edgeSensitivity={30}
              glowColor="20 90% 65%"
              backgroundColor="#111110"
              borderRadius={20}
              glowRadius={40}
              glowIntensity={1.2}
              coneSpread={28}
              colors={['#f36d45', '#ffb490', '#d97706']}
              className="w-full rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
            >
              <div className="relative flex min-h-[210px] max-sm:min-h-[168px] items-center justify-between overflow-hidden py-8 px-[5%] max-sm:px-5 border border-white/10 bg-[radial-gradient(ellipse_at_12%_80%,rgba(141,67,46,0.17),transparent_33%),radial-gradient(ellipse_at_90%_10%,rgba(105,71,47,0.14),transparent_37%),#111110] after:absolute after:top-1/2 after:right-[17%] max-sm:after:right-[6%] after:w-[380px] max-sm:after:w-[230px] after:h-[380px] max-sm:after:h-[230px] after:border after:border-[#fdd9bf]/10 after:rounded-full after:-translate-y-1/2 after:shadow-[0_0_0_35px_rgba(255,255,255,0.012),0_0_0_84px_rgba(255,255,255,0.01)] rounded-[inherit]">
                <div className="relative z-20 w-[68px] sm:w-[88px] max-sm:w-[54px] aspect-square flex-none -rotate-6">
                  <img
                    src="/joseph-logo.svg"
                    alt="Joseph Akinwole Logo"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_24px_rgba(243,109,69,0.35)]"
                    width={88}
                    height={88}
                  />
                </div>
                <div className="relative z-20 mr-auto ml-[7%] max-sm:ml-5">
                  <span className="text-[#9e968f] font-mono text-[8px] tracking-[0.1em]">MY NORTH STAR</span>
                  <p className="mt-4 text-[#e8e1d9] text-[clamp(21px,3vw,38px)] max-sm:text-[21px] font-medium leading-[1.2] tracking-[-0.07em]">
                    Make it easy to use.<br />Make it hard to forget.
                  </p>
                </div>
                <span className="relative z-20 self-end text-right text-[#9e968f] font-mono text-[8px] max-sm:text-[7px] tracking-[0.1em] max-[365px]:hidden">
                  BASED IN<br />{portfolio.contact.location.toUpperCase()}
                </span>
              </div>
            </BorderGlow>
          </Reveal>
        </section>

        {/* Skills Section */}
        <section
          className="relative overflow-hidden pb-[clamp(100px,13vw,176px)] max-sm:pb-25 border-t border-white/13 bg-[#11110f]"
          aria-labelledby="skills-title"
        >
          <div className="w-full overflow-hidden py-5 max-sm:py-3.5 border-y border-white/13 bg-[#171512] -rotate-[1.4deg] scale-[1.03]" aria-hidden="true">
            <div className="flex w-max animate-ticker whitespace-nowrap">
              {[0, 1].map((repeat) => (
                <span key={repeat} className="text-[#ded4c9] font-mono text-[9px] max-sm:text-[8px] tracking-[0.16em]">
                  LESS FRICTION <i className="px-4 text-ember text-[13px] not-italic">✳</i> MORE FEELING <i className="px-4 text-ember text-[13px] not-italic">✳</i> THOUGHTFUL BY DEFAULT <i className="px-4 text-ember text-[13px] not-italic">✳</i> BUILT TO MATTER <i className="px-4 text-ember text-[13px] not-italic">✳</i> LESS FRICTION <i className="px-4 text-ember text-[13px] not-italic">✳</i> MORE FEELING <i className="px-4 text-ember text-[13px] not-italic">✳</i>{' '}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-[clamp(100px,12vw,159px)] max-sm:pt-25">
            <div className="grid grid-cols-[1.1fr_0.75fr] max-sm:grid-cols-1 items-end gap-15 max-sm:gap-4 mb-16 max-sm:mb-9">
              <Reveal>
                <ProjectLabel>THE TOOLKIT / 03</ProjectLabel>
                <h2
                  id="skills-title"
                  className="mt-7 max-sm:mt-5 text-[clamp(62px,8.1vw,111px)] max-sm:text-[clamp(68px,15vw,98px)] font-medium leading-[0.84] tracking-[-0.103em] -ml-[0.05em]"
                >
                  Fluent in<br />
                  <span className="text-[#928b85]">
                    the details<span className="text-ember-soft">.</span>
                  </span>
                </h2>
              </Reveal>
              <Reveal delay={120} className="justify-self-end max-sm:justify-self-start max-w-[335px] max-sm:max-w-[340px] pb-1.25">
                <p className="text-[#a8a19b] text-xs max-sm:text-[11px] leading-[1.85]">
                  A full-stack toolkit spanning languages, interface frameworks, server-side development, testing, and cloud platforms.
                </p>
                <span className="flex items-center gap-2 mt-6 max-sm:mt-4.5 text-[#d2c9c1] font-mono text-[7px] tracking-[0.1em]">
                  <i className="w-1.25 h-1.25 flex-none rounded-full bg-[#b4d579] shadow-[0_0_12px_rgba(180,213,121,0.55)] not-italic" />
                  ALWAYS LEARNING, ALWAYS BUILDING
                </span>
              </Reveal>
            </div>

            <div className="flex flex-col gap-16">
              {skillGroups.map((group, groupIndex) => (
                <section key={group.title} aria-labelledby={`skill-group-${groupIndex}`}>
                  <div className="flex items-baseline justify-between mb-4 border-b border-white/10 pb-2 text-[#99918a] font-mono text-[8px] tracking-[0.1em]">
                    <span>0{groupIndex + 1} / DISCIPLINE</span>
                    <h3 id={`skill-group-${groupIndex}`} className="text-xl font-medium text-paper tracking-[-0.04em]">
                      {group.title}<i className="text-ember not-italic">.</i>
                    </h3>
                  </div>
                  <div className="grid grid-cols-4 max-md:grid-cols-2 max-sm:grid-cols-2 m-0 p-0 border-t border-l border-white/13 list-none" role="list">
                    {group.items.map((skill, index) => (
                      <Reveal
                        key={skill.name}
                        role="listitem"
                        delay={(index % 4) * 40}
                        className="group relative flex min-h-[176px] max-md:min-h-[145px] max-sm:min-h-[135px] flex-col items-start justify-center p-5 max-md:p-3.5 border-r border-b border-white/13 transition-colors duration-300 hover:bg-[#1a1714]"
                      >
                        <span className="absolute top-4 left-5 max-md:left-3.5 text-[#877e77] font-mono text-[7px] tracking-[0.1em]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <strong className="mt-3 text-[clamp(16px,2vw,23px)] max-sm:text-lg font-medium tracking-[-0.06em]">
                          {skill.name}
                        </strong>
                        <small className="mt-1.5 text-[#99918a] font-mono text-[8px] max-sm:text-[7px] tracking-[0.02em]">
                          {skill.note}
                        </small>
                        <span className="absolute top-4 right-5 max-md:right-3.5 text-ember text-[15px] transition-transform duration-500 group-hover:rotate-[75deg]">
                          ✳
                        </span>
                      </Reveal>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-12 pt-6 border-t border-white/10 text-quiet font-mono text-[8px] tracking-[0.1em]">
              <span>ALSO HOW I WORK</span>
              {softSkills.map((skill) => (
                <i key={skill} className="not-italic px-3 py-1 border border-white/10 rounded-full text-[#c4beb8]">
                  {skill}
                </i>
              ))}
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section
          className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-[clamp(117px,15vw,205px)] max-sm:pt-26 pb-[clamp(135px,17vw,235px)] max-sm:pb-30"
          id="experience"
          aria-labelledby="timeline-title"
        >
          <div className="grid grid-cols-[1.15fr_0.55fr] max-sm:grid-cols-1 items-end gap-15 max-sm:gap-4 mb-16 max-sm:mb-9">
            <Reveal>
              <ProjectLabel>CAREER / 04</ProjectLabel>
              <h2
                id="timeline-title"
                className="mt-7 max-sm:mt-5 text-[clamp(58px,7.4vw,100px)] max-sm:text-[clamp(68px,15vw,98px)] font-medium leading-[0.84] tracking-[-0.103em] -ml-[0.05em]"
              >
                Built on<br />
                <span className="text-[#8e8883]">experience.</span>
              </h2>
            </Reveal>
            <Reveal delay={120} className="justify-self-end max-sm:justify-self-start max-w-[280px] max-sm:max-w-[330px] pb-1.5">
              <p className="text-[#a7a09a] text-xs max-sm:text-[11px] leading-[1.9]">
                From financial platforms to product interfaces, I’ve worked across the stack and alongside teams building software for real people.
              </p>
            </Reveal>
          </div>

          <ExperienceTimeline />
        </section>

        {/* Contact Section */}
        <ContactSection />
      </main>

      {/* Footer */}
      <footer className="flex max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:gap-y-5.5 min-h-[125px] items-center justify-between gap-7 py-6 px-[clamp(24px,6.4vw,105px)] max-sm:px-6 border-t border-white/13">
        <div className="max-sm:col-start-1 max-sm:row-start-1">
          <BrandMark />
        </div>
        <p className="m-0 text-[#c8c0b8] font-mono text-[8px] max-sm:text-[7px] leading-[1.8] tracking-[0.02em] max-sm:col-start-1 max-sm:row-start-2">
          Thoughtfully made on the internet.<br />
          <span className="text-[#88817a]">© Joseph Akinwole 2026</span>
        </p>
        <div className="flex max-sm:flex-col gap-6 max-sm:gap-2 text-[#beb5ad] font-mono text-[7px] tracking-[0.1em] max-sm:col-start-2 max-sm:row-start-2">
          <a href="#home" className="hover:text-ember-soft transition-colors">BACK TO TOP ↑</a>
          <a href={`mailto:${EMAIL}`} className="hover:text-ember-soft transition-colors">EMAIL ↗</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-ember-soft transition-colors">GITHUB ↗</a>
        </div>
        <span className="text-[#88817a] font-mono text-[7px] max-sm:text-[6px] tracking-[0.1em] text-right max-sm:col-start-2 max-sm:row-start-1">
          JOSEPH AKINWOLE®<br />{portfolio.contact.location.toUpperCase()}
        </span>
      </footer>
    </>
  );
}
