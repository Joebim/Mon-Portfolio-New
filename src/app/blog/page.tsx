import { getAllBlogArticles } from '../../lib/controllers/blogController';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Arrow, ProjectLabel } from '../../components/SiteNavigation';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Writing — Joseph Akinwole',
  description: "Thoughts on frontend craft, financial tooling, and the things I've learned building software people use.",
};

const TAG_COLORS: Record<string, string> = {
  react: '#61DAFB',
  javascript: '#F7DF1E',
  typescript: '#3178C6',
  css: '#1572B6',
  nextjs: '#ffffff',
  webdev: '#F05340',
  career: '#B4D579',
  programming: '#A78BFA',
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag.toLowerCase()] ?? '#888';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function BlogIndexPage() {
  const { articles } = await getAllBlogArticles();

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-paper">
      {/* Nav back */}
      <div className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-10 max-sm:pt-8">
        <Link
          href="/#writing"
          className="inline-flex items-center gap-2.5 text-[#888] font-mono text-[8px] tracking-[0.1em] hover:text-ember-soft transition-colors"
        >
          ← BACK HOME
        </Link>
      </div>

      {/* Header */}
      <header className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-[clamp(60px,8vw,100px)] max-sm:pt-14 pb-[clamp(60px,7vw,90px)] max-sm:pb-14">
        <ProjectLabel>ALL ARTICLES</ProjectLabel>
        <h1 className="mt-7 max-sm:mt-5 text-[clamp(62px,8.5vw,118px)] max-sm:text-[clamp(58px,14vw,88px)] font-medium leading-[0.84] tracking-[-0.103em] -ml-[0.05em]">
          Words I've<br />
          <span className="text-[#8e8883]">
            shipped<span className="text-ember-soft">.</span>
          </span>
        </h1>
        <p className="mt-8 max-sm:mt-6 max-w-[440px] text-[#aaa39e] text-[13px] max-sm:text-xs leading-[1.85]">
          {articles.length} article{articles.length !== 1 ? 's' : ''} on frontend craft, financial tooling, and building software people love.
        </p>
      </header>

      {/* Article Grid */}
      <section className="w-full max-w-[calc(1512px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pb-[clamp(120px,15vw,200px)] max-sm:pb-28">
        <div className="grid grid-cols-1 gap-0 border-t border-white/13">
          {articles.map((article, index) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group grid grid-cols-[auto_1fr_auto] max-sm:grid-cols-1 items-start gap-x-10 gap-y-4 py-8 max-sm:py-7 border-b border-white/13 transition-all duration-250 hover:bg-white/[0.025] px-4 -mx-4 rounded-lg"
            >
              {/* Cover */}
              <div className="w-[180px] max-sm:w-full h-[110px] max-sm:h-[180px] rounded-lg overflow-hidden flex-none bg-[#1a1714]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.coverImage || article.socialImage || 'https://images.unsplash.com/photo-1737071371043-761e02b1ef95?q=80&w=1200'}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading={index < 3 ? 'eager' : 'lazy'}
                />
              </div>

              {/* Content */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {(Array.isArray(article.tagList) ? article.tagList : []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[7px] tracking-[0.1em] px-2 py-0.5 rounded-full border"
                      style={{ color: tagColor(tag), borderColor: `${tagColor(tag)}33` }}
                    >
                      {tag.toUpperCase()}
                    </span>
                  ))}
                  {article.mediumUrl && (
                    <span className="font-mono text-[7px] tracking-[0.1em] px-2 py-0.5 rounded-full border border-green-500/30 text-green-400">
                      MEDIUM
                    </span>
                  )}
                  {article.devtoUrl && (
                    <span className="font-mono text-[7px] tracking-[0.1em] px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-400">
                      DEV.TO
                    </span>
                  )}
                </div>
                <h2 className="text-[clamp(17px,2vw,23px)] max-sm:text-lg font-medium leading-[1.25] tracking-[-0.04em] mb-3 group-hover:text-ember-soft transition-colors duration-200">
                  {article.title}
                </h2>
                <p className="text-[#9a9189] text-xs max-sm:text-[11px] leading-[1.8] line-clamp-2">
                  {article.description}
                </p>
              </div>

              {/* Meta */}
              <div className="flex flex-col items-end max-sm:flex-row max-sm:justify-between gap-3 pt-1 text-[#6e6760] font-mono text-[7px] max-sm:text-[8px] tracking-[0.08em] whitespace-nowrap">
                <span>{formatDate(article.publishedAt)}</span>
                <span>{article.readingTimeMinutes} MIN</span>
                <Arrow className="w-3 text-ember mt-auto max-sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            </Link>
          ))}
        </div>

        {articles.length === 0 && (
          <div className="py-24 text-center text-[#5a5450] font-mono text-xs tracking-[0.1em]">
            NO ARTICLES FOUND
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between gap-7 py-6 px-[clamp(24px,6.4vw,105px)] max-sm:px-6 border-t border-white/13">
        <p className="m-0 text-[#88817a] font-mono text-[7px] tracking-[0.02em]">
          © Joseph Akinwole 2026
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://dev.to/joebim"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#88817a] font-mono text-[7px] tracking-[0.1em] hover:text-ember-soft transition-colors"
          >
            DEV.TO <Arrow className="w-2.5 text-ember" />
          </a>
          <a
            href="https://medium.com/@JosephAkinwole"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#88817a] font-mono text-[7px] tracking-[0.1em] hover:text-ember-soft transition-colors"
          >
            MEDIUM <Arrow className="w-2.5 text-ember" />
          </a>
        </div>
      </footer>
    </main>
  );
}

