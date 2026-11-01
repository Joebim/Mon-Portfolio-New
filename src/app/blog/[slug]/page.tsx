import { getAllBlogArticles, getBlogArticleBySlug } from '../../../lib/controllers/blogController';
import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { Arrow, ProjectLabel } from '../../../components/SiteNavigation';
import 'highlight.js/styles/github-dark.css';

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const { articles } = await getAllBlogArticles();
    return articles.map((a) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const article = await getBlogArticleBySlug(slug);
    if (!article) return { title: 'Article — Joseph Akinwole' };
    const cover = article.coverImage || article.socialImage;
    return {
      title: `${article.title} — Joseph Akinwole`,
      description: article.description,
      openGraph: {
        title: article.title,
        description: article.description,
        images: cover ? [{ url: cover }] : [],
        type: 'article',
      },
    };
  } catch {
    return { title: 'Article — Joseph Akinwole' };
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

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

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getBlogArticleBySlug(slug);

  if (!article) {
    return (
      <main className="min-h-screen bg-[#0B0B0B] text-paper flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#888] font-mono text-xs mb-6">ARTICLE NOT FOUND</p>
          <Link href="/blog" className="text-ember-soft font-mono text-[8px] tracking-[0.1em] hover:underline">
            ← ALL ARTICLES
          </Link>
        </div>
      </main>
    );
  }

  const coverUrl = article.coverImage || article.socialImage || 'https://images.unsplash.com/photo-1737071371043-761e02b1ef95?q=80&w=1200';

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-paper">
      {/* Back nav */}
      <div className="w-full max-w-[calc(760px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-10 max-sm:pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2.5 text-[#888] font-mono text-[8px] tracking-[0.1em] hover:text-ember-soft transition-colors"
        >
          ← ALL ARTICLES
        </Link>
      </div>

      {/* Cover image */}
      <div className="w-full max-w-[calc(960px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 mt-10 max-sm:mt-8">
        <div className="w-full aspect-[16/7] max-sm:aspect-[16/9] rounded-2xl overflow-hidden bg-[#1a1714]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Article header */}
      <header className="w-full max-w-[calc(760px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pt-12 max-sm:pt-9 pb-10 max-sm:pb-8">
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(Array.isArray(article.tagList) ? article.tagList : []).map((tag) => (
            <span
              key={tag}
              className="font-mono text-[7px] tracking-[0.1em] px-2.5 py-1 rounded-full border"
              style={{ color: tagColor(tag), borderColor: `${tagColor(tag)}40` }}
            >
              {tag.toUpperCase()}
            </span>
          ))}
        </div>

        <h1 className="text-[clamp(32px,5vw,58px)] max-sm:text-[clamp(28px,8vw,42px)] font-medium leading-[1.1] tracking-[-0.06em] mb-6">
          {article.title}
        </h1>

        <p className="text-[#aaa39e] text-base max-sm:text-[15px] leading-[1.75] mb-8 max-w-[600px]">
          {article.description}
        </p>

        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-6 max-sm:gap-4 py-5 border-y border-white/13 text-[#6e6760] font-mono text-[8px] tracking-[0.1em]">
          <span>{formatDate(article.publishedAt)}</span>
          <span>{article.readingTimeMinutes} MIN READ</span>

          <div className="ml-auto flex items-center gap-4 flex-wrap">
            {article.devtoUrl && (
              <a
                href={article.devtoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#aaa39e] hover:text-ember-soft transition-colors"
              >
                READ ON DEV.TO <Arrow className="w-2.5 text-ember" />
              </a>
            )}
            {article.mediumUrl && (
              <a
                href={article.mediumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#69c39d] hover:text-green-300 transition-colors"
              >
                READ ON MEDIUM <Arrow className="w-2.5 text-green-400" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Article body */}
      <article className="w-full max-w-[calc(760px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pb-[clamp(100px,12vw,160px)] max-sm:pb-24 prose prose-invert prose-blog">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug, rehypeHighlight]}
        >
          {article.bodyMarkdown ?? ''}
        </ReactMarkdown>
      </article>

      {/* Bottom CTA */}
      <section className="w-full max-w-[calc(760px+clamp(24px,6.4vw,105px)*2)] mx-auto px-[clamp(24px,6.4vw,105px)] max-sm:px-6 pb-[clamp(80px,10vw,130px)] max-sm:pb-20">
        <div className="border border-white/13 rounded-2xl p-8 max-sm:p-6 bg-[#111110]">
          <ProjectLabel>ENJOY THIS ARTICLE?</ProjectLabel>
          <p className="mt-4 text-[#aaa39e] text-sm max-sm:text-xs leading-[1.85] mb-6 max-w-[420px]">
            More thoughts on financial tooling, frontend craft, and building software that matters.
          </p>
          <div className="flex flex-wrap gap-4">
            {article.devtoUrl && (
              <a
                href={article.devtoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 font-mono text-[8px] tracking-[0.1em] text-paper hover:text-ember-soft transition-colors"
              >
                COMMENT ON DEV.TO <Arrow className="text-ember" />
              </a>
            )}
            {article.mediumUrl && (
              <a
                href={article.mediumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 font-mono text-[8px] tracking-[0.1em] text-[#69c39d] hover:text-green-300 transition-colors"
              >
                READ ON MEDIUM <Arrow className="text-green-400" />
              </a>
            )}
            <Link
              href="/blog"
              className="inline-flex items-center gap-3 font-mono text-[8px] tracking-[0.1em] text-[#888] hover:text-ember-soft transition-colors"
            >
              MORE ARTICLES <Arrow className="text-ember" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between gap-7 py-6 px-[clamp(24px,6.4vw,105px)] max-sm:px-6 border-t border-white/13">
        <Link href="/" className="text-[#88817a] font-mono text-[7px] tracking-[0.08em] hover:text-ember-soft transition-colors">
          JOSEPH AKINWOLE®
        </Link>
        <p className="m-0 text-[#88817a] font-mono text-[7px] tracking-[0.02em]">
          © 2026
        </p>
      </footer>
    </main>
  );
}

