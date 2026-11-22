import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ProductClient from '@/components/ProductClient';
import {
  SITE_NAME,
  SITE_URL,
  buildCanonical,
  buildBreadcrumbJsonLd,
  truncateText,
} from '@/lib/seo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const decodedSlug = decodeURIComponent(id);

  const { data: product } = await supabase
    .from('products')
    .select('title, description, image_url, vendor_article, slug')
    .eq('slug', decodedSlug)
    .single();

  if (!product) {
    return {
      title: 'Товар не знайдено',
      robots: { index: false, follow: false },
    };
  }

  const title = `${product.title} — з нанесенням логотипу оптом${product.vendor_article ? ` (Арт. ${product.vendor_article})` : ''}`;
  const description = product.description
    ? truncateText(
        `${product.title} під нанесення логотипу. ${product.description} Брендування (DTF, вишивка, шовкографія) оптом у ${SITE_NAME}.`,
        160
      )
    : `Замовити ${product.title} під нанесення логотипу оптом у ${SITE_NAME}. DTF-друк, машинна вишивка, шовкографія. Доставка по Україні.`;

  const canonical = buildCanonical(`/product/${encodeURIComponent(product.slug)}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'uk_UA',
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      images: product.image_url ? [{ url: product.image_url, alt: product.title }] : undefined,
    },
  };
}

// Увага: в Next.js 15 params - це Promise!
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {

  // 1. Чекаємо розпакування параметрів
  const { id } = await params;
  const decodedSlug = decodeURIComponent(id); // Декодуємо кирилицю (пляшка-металева...)

  // 2. Завантажуємо товар
  const { data: product, error } = await supabase
    .from('products')
    .select(`
        *,
        product_variants (*),
        product_images (*)
    `)
    .eq('slug', decodedSlug)
    .single();

  if (error || !product) {
    notFound();
  }

  const totalAvailable = Array.isArray(product.product_variants)
    ? product.product_variants.reduce((sum: number, v: { available?: number }) => sum + (v.available || 0), 0)
    : 0;

  const productUrl = buildCanonical(`/product/${encodeURIComponent(product.slug)}`);
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image_url ? [product.image_url] : undefined,
    description: truncateText(
      product.description || `${product.title} під нанесення логотипу оптом у ${SITE_NAME}.`,
      300
    ),
    sku: product.vendor_article || product.id,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      availability: totalAvailable > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Головна', url: SITE_URL },
    { name: 'Каталог', url: buildCanonical('/catalog') },
    { name: product.title, url: productUrl },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductClient product={product} variants={product.product_variants} />
    </>
  );
}