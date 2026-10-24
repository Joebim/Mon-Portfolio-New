'use client';

import type { CSSProperties } from 'react';
import { GITHUB_URL, type Project } from '../data';
import { BorderGlow } from './BorderGlow';

function ArrowUpRight() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="w-3 h-3 flex-none stroke-current fill-none stroke-[1.25] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
      <path d="M4 14 14 4M5 4h9v9" />
    </svg>
  );
}

export function ProjectCard({ project, index, total }: { project: Project; index: number; total: number }) {
  const current = String(index + 1).padStart(2, '0');
  const count = String(total).padStart(2, '0');
  const href = project.url ?? GITHUB_URL;
  const action = project.linkLabel ?? (project.url ? 'VISIT PROJECT' : 'VIEW ON GITHUB');

  return (
    <article className="min-w-0 h-full" style={{ '--project-accent': project.accent } as CSSProperties}>
      <a
        className="group block h-full focus-visible:outline-2 focus-visible:outline-ember-soft focus-visible:outline-offset-4"
        href={href}
        target="_blank"
        rel="noreferrer"
        data-cursor="VIEW"
        aria-label={`${project.url ? action.toLowerCase() : 'View code on GitHub for'} ${project.title}`}
      >
        <BorderGlow
          edgeSensitivity={26}
          glowColor="20 90% 65%"
          backgroundColor="#181918"
          borderRadius={14}
          glowRadius={36}
          glowIntensity={1.2}
          coneSpread={30}
          colors={['#f36d45', project.accent || '#ffb490', '#d97706']}
          className="overflow-hidden rounded-[14px]"
        >
          <div
            className="relative block h-auto aspect-[1.36] max-sm:aspect-[1.26] overflow-hidden bg-[#181918] transition-colors duration-350 before:absolute before:z-0 before:inset-0 before:pointer-events-none before:bg-[linear-gradient(125deg,transparent_50%,rgba(255,255,255,0.08))] before:opacity-70"
            aria-hidden="true"
          >
          <div className="absolute z-20 top-[5%] right-[5%] left-[5%] flex justify-between items-center text-white/70 font-mono text-[clamp(6px,0.65vw,8px)] tracking-[0.08em] uppercase">
            <span className="flex items-center">
              <img src="/joseph-logo-light.svg" alt="Joseph mark" className="w-4 h-4 object-contain" />
            </span>
            <span>{project.category}</span>
            <span className="tracking-[0.3em]">•••</span>
          </div>

          {project.kind === 'realty' && (
            <div className="absolute inset-0 overflow-hidden pt-[17%] px-[8%] pb-[8%] bg-gradient-to-br from-[#283326] via-[#465844] via-55% to-[#2c332c]">
              <span className="relative z-20 block text-[#c5d59a] font-mono text-[7px] tracking-[0.2em]">FIND YOUR</span>
              <b className="relative z-20 block mt-2.5 text-[#eff2dc] text-[clamp(25px,4.1vw,51px)] max-sm:text-[clamp(36px,10vw,53px)] font-medium leading-[0.98] tracking-[-0.07em]">
                place to<br />belong.
              </b>
              <div className="absolute top-[11%] right-[11%] w-[43%] h-[72%] border border-[#eef1d3]/45 bg-gradient-to-br from-[#e4e3c5]/10 to-[#ccd093]/30 [clip-path:polygon(50%_0,100%_34%,100%_100%,0_100%,0_34%)] rotate-4 before:absolute before:top-0 before:left-[41%] before:w-[1px] before:h-full before:bg-[#e6e5ca]/35 before:rotate-[13deg] after:absolute after:top-[56%] after:right-[5%] after:left-[5%] after:h-[1px] after:bg-[#e6e5ca]/45">
                <i className="absolute bottom-0 left-[13%] w-[23%] h-[35%] border border-[#e6e5ca]/55" />
                <i className="absolute bottom-[23%] left-[50%] w-[23%] h-[23%] border border-[#e6e5ca]/55" />
                <i className="absolute bottom-0 right-[10%] w-[23%] h-[35%] border border-[#e6e5ca]/55" />
              </div>
              <small className="absolute bottom-[8%] left-[8%] text-[#c5d59a] font-mono text-[6px] tracking-[0.2em]">01 / DISCOVER HOME</small>
            </div>
          )}

          {project.kind === 'health' && (
            <div className="absolute inset-0 pt-[17%] px-[8%] pb-[8%] text-[#f4efff] bg-[radial-gradient(ellipse_at_73%_27%,#50447f,transparent_47%),linear-gradient(130deg,#211e35,#242233_60%,#343047)]">
              <div className="absolute top-[17%] left-[8%] flex flex-col gap-1.5">
                <small className="text-[#bcb2df] font-mono text-[6px] tracking-[0.15em]">YOUR OVERVIEW</small>
                <b className="my-1.5 text-[clamp(17px,2.5vw,32px)] max-sm:text-[clamp(36px,10vw,53px)] leading-[1.08] tracking-[-0.07em]">Feel good.<br />Know more.</b>
                <span className="text-[#9b90c4] font-mono text-[6px] tracking-[0.15em]">DAILY VITALS</span>
              </div>
              <div className="absolute top-[21%] right-[11%] flex w-[31%] aspect-square items-center justify-center flex-col border border-[#c5b5fe]/35 rounded-full bg-[radial-gradient(circle,#8d76c457,#7065a21b_65%,transparent)] shadow-[inset_0_0_22px_#bbaaff28,0_0_42px_#a990ff18] before:absolute before:inset-[8%] before:border before:border-[#bca9fe]/25 before:border-t-[#c9bfff] before:rounded-full before:rotate-[26deg]">
                <b className="text-[clamp(19px,3vw,39px)] font-medium leading-none">84</b>
                <small className="text-[#c7bbea] font-mono text-[5px] tracking-[0.18em]">WELLNESS</small>
                <i />
              </div>
              <div className="absolute right-[8%] bottom-[13%] left-[8%] flex h-[25%] items-end gap-[3%] border-b border-[#e3daff]/25">
                <i className="h-[33%] flex-1 rounded-t bg-gradient-to-t from-[#7566a0] to-[#b9aaff]" />
                <i className="h-[61%] flex-1 rounded-t bg-gradient-to-t from-[#7566a0] to-[#b9aaff]" />
                <i className="h-[45%] flex-1 rounded-t bg-gradient-to-t from-[#7566a0] to-[#b9aaff]" />
                <i className="h-[79%] flex-1 rounded-t bg-[#e0baba]" />
                <i className="h-[33%] flex-1 rounded-t bg-gradient-to-t from-[#7566a0] to-[#b9aaff]" />
                <i className="h-[61%] flex-1 rounded-t bg-gradient-to-t from-[#7566a0] to-[#b9aaff]" />
                <i className="h-[90%] flex-1 rounded-t bg-gradient-to-t from-[#7566a0] to-[#b9aaff]" />
                <i className="h-[45%] flex-1 rounded-t bg-gradient-to-t from-[#7566a0] to-[#b9aaff]" />
                <i className="h-[61%] flex-1 rounded-t bg-gradient-to-t from-[#7566a0] to-[#b9aaff]" />
                <i className="h-[33%] flex-1 rounded-t bg-gradient-to-t from-[#7566a0] to-[#b9aaff]" />
              </div>
            </div>
          )}

          {project.kind === 'language' && (
            <div className="absolute inset-0 pt-[17%] px-[8%] pb-[7%] text-[#2c211b] bg-gradient-to-br from-[#eac7a5] via-[#f3dbc2] via-50% to-[#d9966b] before:absolute before:-right-[5%] before:-bottom-[33%] before:w-[68%] before:aspect-square before:border before:border-[#9d6747]/35 before:rounded-full before:shadow-[0_0_0_12px_#9d674711,0_0_0_30px_#9d674710,0_0_0_53px_#9d67470c]">
              <span className="absolute top-[14%] right-[9%] py-1.5 px-2.5 border border-[#79533d]/40 rounded-full font-mono text-[7px] rotate-[13deg]">01—04</span>
              <small className="font-mono text-[6px] tracking-[0.15em]">EXPLORE A NEW WORLD</small>
              <b className="block mt-3.5 text-[clamp(30px,5vw,63px)] max-sm:text-[clamp(36px,10vw,53px)] font-medium leading-[0.95] tracking-[-0.09em]">
                Say it<br /><em className="text-[#944932] font-medium not-italic">your way.</em>
              </b>
              <div className="absolute top-[35%] right-[15%] text-ember text-[clamp(38px,7vw,92px)] animate-slow-spin">✳</div>
              <span className="absolute bottom-[13%] left-[8%] py-2 px-3 border border-[#735440]/45 font-mono text-[6px] tracking-[0.08em]">START YOUR QUEST ↗</span>
            </div>
          )}

          {project.kind === 'links' && (
            <div className="absolute inset-0 pt-[16%] px-[8%] pb-[8%] text-[#18232c] bg-gradient-to-br from-[#d2e9fa] via-[#a4cae3] via-50% to-[#75add2]">
              <div className="absolute top-[14%] right-[8%] grid w-8 h-8 place-items-center rounded-full bg-[#4579a3] text-[#e4f3ff] font-extrabold text-sm">d.</div>
              <small className="font-mono text-[6px] tracking-[0.12em]">LINKS, THAT FEEL LIKE YOU.</small>
              <b className="block mt-3.5 text-[clamp(30px,4.6vw,59px)] max-sm:text-[clamp(36px,10vw,53px)] font-semibold leading-[0.94] tracking-[-0.09em]">
                One link.<br />More you.
              </b>
              <span className="inline-block mt-5 py-1.5 px-2.5 rounded-full bg-[#1b2a35] text-[#eaf5ff] font-mono text-[6px] tracking-[0.05em]">✳ &nbsp; BUILD YOUR SPACE &nbsp; ↗</span>
              <i className="absolute right-[19%] bottom-[11%] text-[#f5f3dc] text-[clamp(43px,6vw,75px)] not-italic rotate-[20deg]">✷</i>
            </div>
          )}

          {project.kind === 'meme' && (
            <div className="absolute inset-0 overflow-hidden pt-[18%] px-[8%] pb-[8%] text-[#eef1dc] bg-[radial-gradient(ellipse_at_72%_41%,#343c20,#1d2019_51%,#171814)] before:absolute before:-right-[12%] before:-bottom-[48%] before:w-[75%] before:aspect-square before:border before:border-[#c4f07b]/20 before:rounded-full before:shadow-[0_0_0_18px_#c4f07b08,0_0_0_46px_#c4f07b08,0_0_0_78px_#c4f07b07]">
              <small className="relative z-20 text-[#ccd99c] font-mono text-[6px] tracking-[0.16em]">GOOD VIBES. BETTER PURPOSE.</small>
              <b className="relative z-20 block mt-3 text-[clamp(30px,4.5vw,58px)] max-sm:text-[clamp(36px,10vw,53px)] font-medium leading-[0.91] tracking-[-0.095em]">
                Culture<br />with a<br /><i className="text-[#c4f07b] font-medium not-italic">cause.</i>
              </b>
              <div className="absolute top-[22%] right-[10%] flex w-[35%] aspect-square items-center justify-center flex-col border border-[#efffcc]/70 rounded-full bg-[radial-gradient(circle_at_33%_25%,#efffc2,#b4d762_43%,#53672e_90%)] text-[#202418] shadow-[inset_-9px_-10px_19px_#41532666,0_0_35px_#c4f07b32] rotate-[11deg] transition-transform duration-400 group-hover:-rotate-6 group-hover:-translate-y-1">
                <span className="text-[clamp(22px,3.5vw,40px)] leading-none">✳</span>
                <b className="mt-0.5 font-mono text-[clamp(6px,0.9vw,10px)] tracking-[0.14em] text-center">PUGA<br />GOOD</b>
              </div>
              <span className="absolute bottom-[12%] left-[8%] text-[#b5bc9c] font-mono text-[6px] tracking-[0.1em]">A LITTLE LAUGHTER GOES A LONG WAY ↗</span>
            </div>
          )}

          {project.kind === 'interior' && (
            <div className="absolute inset-0 pt-[18%] px-[8%] pb-[8%] text-[#332b26] bg-[radial-gradient(ellipse_at_72%_42%,#bc9d80,#998370_46%,#75695b)]">
              <small className="relative z-20 font-mono text-[6px] tracking-[0.11em]">MADE FOR SLOWER MORNINGS</small>
              <b className="relative z-20 block mt-3.5 text-[clamp(29px,4.6vw,58px)] max-sm:text-[clamp(36px,10vw,53px)] font-medium leading-[0.89] tracking-[-0.1em]">
                The soft<br />side of<br /><i className="text-[#edca9d] font-medium not-italic">living.</i>
              </b>
              <span className="absolute top-[24%] right-[13%] w-[36%] h-[48%] border border-[#e5cfb9]/60 rounded-t-[50%] rounded-b-[18%] bg-gradient-to-br from-[#edd1a8]/80 to-[#80684e] shadow-[24px_20px_25px_#372a234e] -rotate-9 before:absolute before:top-[73%] before:left-[22%] before:w-[3px] before:h-[37%] before:bg-[#dbbc94] before:rotate-[8deg] after:absolute after:top-[73%] after:right-[19%] after:w-[3px] after:h-[37%] after:bg-[#dbbc94] after:-rotate-[9deg]" />
              <span className="absolute bottom-[12%] left-[8%] text-[#ece1d5] font-mono text-[6px] leading-[1.8] tracking-[0.1em]">STUDIO / 03<br />VIEW THE PIECE ↗</span>
            </div>
          )}

          {project.kind === 'fashion' && (
            <div className="absolute inset-0 pt-[18%] px-[8%] pb-[8%] text-[#2f2531] bg-[radial-gradient(ellipse_at_77%_45%,#f2c4de,#cc95bf_47%,#886c91)]">
              <span className="absolute top-[16%] right-[11%] w-[37%] h-[66%] border border-[#fff0f4]/65 rounded-[45%_45%_15%_15%/33%_33%_19%_19%] rotate-8 before:absolute before:inset-[8%_11%] before:border before:border-[#fff0f4]/60 before:rounded-[46%_46%_10%_10%] after:absolute after:top-[42%] after:right-[6%] after:left-[6%] after:h-[1px] after:bg-[#fff0f4]/45" />
              <small className="relative z-20 font-mono text-[6px] tracking-[0.12em]">STYLE / COMMUNITY / YOU</small>
              <b className="relative z-20 block mt-4 text-[clamp(29px,4.6vw,58px)] max-sm:text-[clamp(36px,10vw,53px)] font-medium leading-[0.92] tracking-[-0.1em]">
                Wear your<br /><i className="text-[#fcf1eb] font-medium not-italic">own story.</i>
              </b>
              <span className="absolute top-[23%] right-[31%] text-[#f7dced] text-[70px] leading-none">•</span>
              <em className="absolute bottom-[11%] left-[8%] font-mono text-[8px] not-italic tracking-[0.23em]">GLIMERE®</em>
            </div>
          )}

          {project.kind === 'type' && (
            <div className="absolute inset-0 pt-[19%] px-[8%] pb-[8%] text-[#281712] bg-[radial-gradient(ellipse_at_50%_49%,#f18c64,#e46446_51%,#8e372e)]">
              <small className="font-mono text-[6px] tracking-[0.18em]">THE TYPE PLAYGROUND</small>
              <b className="block -mt-[1%] -ml-[2%] text-[#f8d3be] text-[clamp(94px,17vw,210px)] max-sm:text-[clamp(130px,43vw,195px)] font-medium leading-[0.88] tracking-[-0.14em] drop-shadow-[5px_6px_0_rgba(134,46,38,0.2)]">Aa</b>
              <span className="absolute right-[8%] bottom-[15%] left-[8%] flex justify-between pt-1.5 border-t border-[#fff2e1]/35 font-mono text-[7px] tracking-[0.11em]">
                MAKE WORDS MOVE<span>↗</span>
              </span>
              <i className="absolute top-[27%] right-[18%] text-[#f7d4bd] text-[28px] not-italic animate-slow-spin">✳</i>
            </div>
          )}

          {project.kind === 'impact' && (
            <div className="absolute inset-0 pt-[18%] px-[8%] pb-[8%] text-[#243032] bg-[radial-gradient(ellipse_at_69%_43%,#b9d3d4,#83aeb0_55%,#466e72)]">
              <span className="absolute top-[17%] right-[12%] text-[#e9ded0] text-[clamp(45px,7vw,88px)]">✳</span>
              <small className="relative z-20 font-mono text-[6px] tracking-[0.12em]">A CLEANER KIND OF CARE</small>
              <b className="relative z-20 block mt-4.5 text-[clamp(36px,5.5vw,70px)] max-sm:text-[clamp(36px,10vw,53px)] font-medium leading-[0.93] tracking-[-0.1em]">
                Room for<br /><i className="text-[#e2ece0] font-medium not-italic">better.</i>
              </b>
              <span className="absolute bottom-[13%] left-[8%] font-mono text-[6px] tracking-[0.08em]">HOME &nbsp; • &nbsp; OFFICE &nbsp; • &nbsp; COMMUNITY</span>
            </div>
          )}

          <span className="absolute z-30 right-[5%] bottom-[4%] text-white/50 font-mono text-[7px] tracking-[0.12em]">{current} / {count}</span>
        </div>
      </BorderGlow>

        <div className="flex justify-between gap-4.5 pt-4.5">
          <div className="flex-1 min-w-0">
            <div className="flex gap-3.5 text-[#96908b] font-mono text-[7px] tracking-[0.085em] uppercase">
              <span>{project.year}</span>
              <span>{project.category}</span>
            </div>
            <h3 className="flex items-center gap-3.5 my-2 text-paper text-[clamp(20px,2.45vw,32px)] max-sm:text-2xl font-medium leading-[1.1] tracking-[-0.07em] transition-colors duration-200 group-hover:text-ember-soft">
              {project.title}
              <span className="inline-flex items-center text-ember transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                <ArrowUpRight />
              </span>
            </h3>
            <p className="max-w-[465px] m-0 text-[#9b9490] text-[11px] leading-[1.8]">{project.description}</p>
            <ul className="flex flex-wrap gap-1.5 mt-3 p-0 text-[#b5aea8] font-mono text-[7px] leading-[1.4] tracking-[0.015em] list-none" aria-label="Technologies used">
              {project.technologies.map((technology) => (
                <li
                  key={technology}
                  className="py-1 px-2 border border-white/15 rounded-full transition-colors duration-250 group-hover:border-[var(--project-accent)]/50"
                >
                  {technology}
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-2 mt-3.5 text-[#c7bfb7] font-mono text-[7px] tracking-[0.1em] transition-colors duration-250 group-hover:text-ember-soft">
              {action}
              <ArrowUpRight />
            </span>
          </div>
        </div>
      </a>
    </article>
  );
}
