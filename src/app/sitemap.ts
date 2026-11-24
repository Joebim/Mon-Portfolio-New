import type { MetadataRoute } from 'next';
import { getAllBlogArticles } from '../lib/controllers/blogController';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.josephakinwole.dev').replace(/\/$/, '');
  const currentDate = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  try {
    const { articles } = await getAllBlogArticles();
    const blogEntries: MetadataRoute.Sitemap = (articles || [])
      .filter((article) => !article.isDraft && Boolean(article.slug))
      .map((article) => ({
        url: `${baseUrl}/blog/${article.slug}`,
        lastModified: article.publishedAt ? new Date(article.publishedAt) : currentDate,
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    return [...staticEntries, ...blogEntries];
  } catch {
    return staticEntries;
  }
}
