import type { MetadataRoute } from 'next';
import { portfolio } from '../data';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${portfolio.contact.name}® — ${portfolio.contact.role}`,
    short_name: `${portfolio.contact.name}`,
    description: `${portfolio.contact.name} is a ${portfolio.contact.role} building financial software, thoughtful product interfaces, and useful web experiences.`,
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b0b',
    theme_color: '#0b0b0b',
    icons: [
      {
        src: '/joseph-logo-dark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/joseph-logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
