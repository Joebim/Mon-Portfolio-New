import portfolioJson from './portfolio.json';

export const ARCHIVE_URL = portfolioJson.contact.website;
export const GITHUB_URL = portfolioJson.contact.github;
export const EMAIL = portfolioJson.contact.email;

export type Project = {
  title: string;
  year: string;
  category: string;
  description: string;
  technologies: string[];
  accent: string;
  kind: 'realty' | 'health' | 'language' | 'links' | 'interior' | 'fashion' | 'type' | 'impact' | 'meme';
  url?: string;
  linkLabel?: string;
};

export type AdditionalProject = {
  name: string;
  note: string;
  year: string;
  stack: string;
  url?: string;
};

export type Experience = {
  company: string;
  role: string;
  dates: string;
  location: string;
  achievements: string[];
};

export type Skill = { name: string; note: string };
export type SkillGroup = { title: 'Frontend' | 'Backend' | 'Design'; items: Skill[] };

export type PortfolioContent = {
  contact: {
    name: string;
    role: string;
    location: string;
    email: string;
    phone: string;
    website: string;
    github: string;
    profiles: { label: string; short: string; url: string }[];
  };
  profile: { heroIntro: string; aboutLead: string; aboutParagraphs: string[] };
  latestArticle?: {
    title: string;
    description: string;
    date: string;
    readingTime: string;
    platform: string;
    url: string;
  };
  projects: Project[];
  additionalProjects: AdditionalProject[];
  experience: Experience[];
  skillGroups: SkillGroup[];
  softSkills: string[];
};

export const portfolio = portfolioJson as unknown as PortfolioContent;
export const projects = portfolio.projects;
export const smallWorks = portfolio.additionalProjects;
export const skillGroups = portfolio.skillGroups;
export const professionalLinks = portfolio.contact.profiles;
export const experience = portfolio.experience;
export const softSkills = portfolio.softSkills;
