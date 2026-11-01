import type { Metadata, Viewport } from 'next';
import { DM_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { FluidMagneticCursor } from '../components/FluidMagneticCursor';
import { SiteNavigation } from '../components/SiteNavigation';
import { portfolio, GITHUB_URL, EMAIL } from '../data';

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const siteUrl = 'https://josephakinwole.com';

export const viewport: Viewport = {
  themeColor: '#0b0b0b',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${portfolio.contact.name}® — ${portfolio.contact.role}`,
    template: `%s | ${portfolio.contact.name}`,
  },
  description: `${portfolio.contact.name} is a ${portfolio.contact.role.toLowerCase()} specializing in production-grade financial software, high-availability cloud APIs, and polished web interfaces with React, Next.js, TypeScript, and Node.js.`,
  applicationName: `${portfolio.contact.name} Portfolio`,
  authors: [{ name: portfolio.contact.name, url: siteUrl }],
  creator: portfolio.contact.name,
  publisher: portfolio.contact.name,
  keywords: [
    'Joseph Akinwole',
    'Full Stack Engineer',
    'Software Developer',
    'Fintech Software Engineer',
    'Next.js Portfolio',
    'React Developer',
    'TypeScript Engineer',
    'Node.js Developer',
    'Web Development',
    'High-Availability Architecture',
    'Frontend Engineer',
    'Lagos Software Engineer',
    'Nigeria Tech Talent',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: `${portfolio.contact.name} Portfolio`,
    title: `${portfolio.contact.name}® — ${portfolio.contact.role}`,
    description: 'Building financial software, thoughtful product interfaces, and useful web experiences.',
    images: [
      {
        url: '/joseph-portrait.png',
        width: 1200,
        height: 630,
        alt: `${portfolio.contact.name} — ${portfolio.contact.role}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${portfolio.contact.name}® — ${portfolio.contact.role}`,
    description: 'Building financial software, thoughtful product interfaces, and useful web experiences.',
    images: ['/joseph-portrait.png'],
    creator: '@josephakinwole',
  },
  icons: {
    icon: [
      { url: '/joseph-logo-dark.svg', type: 'image/svg+xml' },
      { url: '/joseph-logo.svg', type: 'image/svg+xml' },
    ],
    apple: '/joseph-logo.svg',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${siteUrl}/#person`,
        name: portfolio.contact.name,
        jobTitle: portfolio.contact.role,
        url: siteUrl,
        email: `mailto:${EMAIL}`,
        telephone: portfolio.contact.phone,
        address: {
          '@type': 'PostalAddress',
          addressLocality: portfolio.contact.location,
          addressCountry: 'Nigeria',
        },
        sameAs: [
          GITHUB_URL,
          ...portfolio.contact.profiles.map((p) => p.url),
        ],
        knowsAbout: [
          'TypeScript',
          'Next.js',
          'React',
          'Node.js',
          'Tailwind CSS',
          'Software Architecture',
          'Financial Technology',
          'REST APIs',
          'GraphQL',
          'Enterprise Systems',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: `${portfolio.contact.name} — Portfolio`,
        description: 'Selected work and experience of full stack engineer Joseph Akinwole.',
        publisher: {
          '@id': `${siteUrl}/#person`,
        },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${siteUrl}/#profilepage`,
        url: siteUrl,
        name: `${portfolio.contact.name}® — ${portfolio.contact.role}`,
        mainEntity: {
          '@id': `${siteUrl}/#person`,
        },
      },
    ],
  };

  return (
    <html lang="en" className={`${dmMono.variable} ${manrope.variable} scroll-smooth`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-[#0b0b0b] text-[#eeeae5] antialiased selection:bg-[#ffb490] selection:text-[#0b0b0b]">
        <FluidMagneticCursor />
        <SiteNavigation />
        {children}
      </body>
    </html>
  );
}
