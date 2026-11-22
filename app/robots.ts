import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const DISALLOW_PRIVATE = [
  '/admin',
  '/api',
  '/profile',
  '/checkout',
  '/order-success',
  '/login',
  '/wishlist',
  '/cc',
];

const ALLOW_PUBLIC = ['/', '/catalog', '/product/', '/posluhy', '/CONSTRUCTOR', '/promo/', '/_next/static/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ALLOW_PUBLIC,
        disallow: DISALLOW_PRIVATE,
      },
      {
        userAgent: ['Googlebot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Applebot-Extended'],
        allow: ALLOW_PUBLIC,
        disallow: DISALLOW_PRIVATE,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
