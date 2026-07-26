import type { MetadataRoute } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://www.unhold.live';

/** Public indexable routes (en unprefixed + hi). */
const PUBLIC_PATHS = [
  '',
  '/start',
  '/open-case',
  '/guest/report',
  '/demo',
  '/help',
  '/guides/sop-2026',
  '/legal/disclaimer',
  '/legal/privacy',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of PUBLIC_PATHS) {
    const enUrl = `${siteUrl}${path || '/'}`;
    const hiUrl = `${siteUrl}/hi${path || ''}`;

    entries.push({
      url: enUrl,
      lastModified: now,
      changeFrequency: path === '' ? 'weekly' : 'monthly',
      priority: path === '' ? 1 : path === '/start' || path === '/guides/sop-2026' ? 0.9 : 0.7,
      alternates: {
        languages: {
          en: enUrl,
          hi: hiUrl,
          'x-default': enUrl,
        },
      },
    });

    entries.push({
      url: hiUrl,
      lastModified: now,
      changeFrequency: path === '' ? 'weekly' : 'monthly',
      priority: path === '' ? 0.95 : 0.65,
      alternates: {
        languages: {
          en: enUrl,
          hi: hiUrl,
          'x-default': enUrl,
        },
      },
    });
  }

  return entries;
}
