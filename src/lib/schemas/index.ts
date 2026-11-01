import { z } from 'zod';

export const ContactSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(1),
  location: z.string().min(1),
  website: z.string().url().optional(),
  github: z.string().url().optional(),
  profiles: z.array(
    z.object({
      platform: z.string().min(1),
      username: z.string().min(1),
      url: z.string().url(),
    })
  ).optional().default([]),
});

export const ProfileSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  headline: z.string().min(1),
  status: z.string().min(1),
  aboutLead: z.string().min(1),
  aboutParagraphs: z.array(z.string().min(1)),
});

export const ProjectSchema = z.object({
  title: z.string().min(1),
  year: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  technologies: z.array(z.string().min(1)),
  accent: z.string().min(1),
  kind: z.string().min(1),
  url: z.string().url().optional(),
  linkLabel: z.string().optional(),
  mediaSrc: z.string().optional(),
  mediaAlt: z.string().optional(),
});

export const AdditionalProjectSchema = z.object({
  name: z.string().min(1),
  note: z.string().min(1),
  year: z.string().min(1),
  stack: z.string().min(1),
  url: z.string().url().optional(),
});

export const ExperienceAchievementSchema = z.object({
  metric: z.string().optional(),
  detail: z.string().min(1),
});

export const ExperienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  dates: z.string().min(1),
  location: z.string().min(1),
  achievements: z.array(z.string().min(1)),
  structuredAchievements: z.array(ExperienceAchievementSchema).optional(),
});

export const SkillItemSchema = z.object({
  name: z.string().min(1),
  note: z.string().min(1),
});

export const SkillGroupSchema = z.object({
  title: z.string().min(1),
  items: z.array(SkillItemSchema),
});

export const LatestArticleSchema = z.object({
  id: z.number().optional(),
  slug: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  readingTime: z.string().optional(),
  publishedAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  coverImage: z.string().optional(),
});

export const PortfolioContentSchema = z.object({
  profile: ProfileSchema,
  contact: ContactSchema,
  projects: z.array(ProjectSchema),
  smallWorks: z.array(AdditionalProjectSchema),
  experiences: z.array(ExperienceSchema),
  skillGroups: z.array(SkillGroupSchema),
  softSkills: z.array(z.string()),
  heroIntro: z.string().optional(),
  latestArticle: LatestArticleSchema.optional(),
});

export const BlogArticleSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  coverImage: z.string().optional(),
  socialImage: z.string().optional(),
  publishedAt: z.string().min(1),
  readingTimeMinutes: z.number().int().positive().default(5),
  tagList: z.array(z.string()).default([]),
  url: z.string().url().optional(),
  canonicalUrl: z.string().url().optional(),
  bodyMarkdown: z.string().optional(),
  isDraft: z.boolean().default(false),
  // Cross-posting tracking
  devtoId: z.number().optional(),
  devtoUrl: z.string().url().optional(),
  mediumId: z.string().optional(),
  mediumUrl: z.string().url().optional(),
  publishedTo: z.array(z.enum(['devto', 'medium', 'portfolio'])).default([]),
});

export type Contact = z.infer<typeof ContactSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type AdditionalProject = z.infer<typeof AdditionalProjectSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type PortfolioContent = z.infer<typeof PortfolioContentSchema>;
export type BlogArticle = z.infer<typeof BlogArticleSchema>;

