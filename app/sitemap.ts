import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/seo';
import { BRANDING_SERVICES } from '@/lib/servicesData';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/catalog`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/posluhy`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/CONSTRUCTOR`,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = BRANDING_SERVICES.map((s) => ({
    url: `${SITE_URL}/posluhy/${s.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const [categoriesRes, productsRes, promoRes] = await Promise.all([
    supabase.from('categories').select('slug'),
    supabase.from('products').select('slug, updated_at, created_at').limit(5000),
    supabase.from('promo_pages').select('slug, updated_at').eq('is_published', true),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = (categoriesRes.data || [])
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${SITE_URL}/catalog?category=${encodeURIComponent(c.slug)}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

  const productRoutes: MetadataRoute.Sitemap = (productsRes.data || [])
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITE_URL}/product/${encodeURIComponent(p.slug)}`,
      ...(p.updated_at || p.created_at
        ? { lastModified: new Date(p.updated_at || p.created_at) }
        : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));

  const promoRoutes: MetadataRoute.Sitemap = (promoRes.data || [])
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITE_URL}/promo/${encodeURIComponent(p.slug)}`,
      ...(p.updated_at ? { lastModified: new Date(p.updated_at) } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...serviceRoutes, ...categoryRoutes, ...productRoutes, ...promoRoutes];
}
