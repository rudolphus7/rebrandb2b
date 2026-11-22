import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import CatalogLayout from '@/components/CatalogLayout';
import { getProducts, SearchParams } from '@/lib/catalog';
import { COLOR_MAP } from '@/lib/colors';
import { SITE_NAME, SITE_URL, buildCanonical, buildBreadcrumbJsonLd } from '@/lib/seo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;

  let categoryName = '';
  if (params.category) {
    const { data: cat } = await supabase
      .from('categories')
      .select('name')
      .eq('slug', params.category)
      .single();
    if (cat?.name) categoryName = cat.name;
  }

  const hasFilterParams = Boolean(
    params.q || params.minPrice || params.maxPrice || params.color || params.inStock || params.label
  );

  const pageNum = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const baseTitle = categoryName
    ? `${categoryName} з нанесенням логотипу оптом — купити під брендування`
    : 'Каталог товарів під нанесення логотипу оптом';
  const title = pageNum > 1 ? `${baseTitle} — Сторінка ${pageNum}` : baseTitle;

  const description = categoryName
    ? `${categoryName} оптом під нанесення логотипу в ${SITE_NAME}. DTF-друк, машинна вишивка, шовкографія та термотрансфер для корпоративного мерчу з доставкою по Україні.`
    : `Повний B2B каталог одягу, аксесуарів та сувенірів під нанесення логотипу оптом. Брендування мерчу: DTF, вишивка, шовкографія в ${SITE_NAME}.`;

  const queryParts: string[] = [];
  if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
  if (pageNum > 1) queryParts.push(`page=${pageNum}`);
  const canonicalPath = queryParts.length > 0 ? `/catalog?${queryParts.join('&')}` : '/catalog';

  return {
    title,
    description,
    alternates: { canonical: buildCanonical(canonicalPath) },
    robots: hasFilterParams ? { index: false, follow: true } : { index: true, follow: true },
  };
}

const getCachedCatalogFilters = unstable_cache(
  async () => {
    const [{ data: categoriesData }, activeColorsCheck] = await Promise.all([
      supabase.from('categories').select('id, name, slug, parent_id').order('name'),
      Promise.all(
        COLOR_MAP.map(async (group) => {
          const { count } = await supabase
            .from('product_variants')
            .select('id', { count: 'exact', head: true })
            .eq('general_color', group.key)
            .limit(1);
          return count && count > 0 ? group.key : null;
        })
      ),
    ]);

    return {
      categories: categoriesData || [],
      availableColors: activeColorsCheck.filter((c): c is string => c !== null),
    };
  },
  ['catalog-filters-v1'],
  { revalidate: 600 }
);

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {

  const params = await searchParams;

  const [{ products, count, page, totalPages }, { categories, availableColors }] = await Promise.all([
    getProducts(params),
    getCachedCatalogFilters(),
  ]);

  const activeCategory = params.category
    ? categories.find((c) => c.slug === params.category)
    : null;

  const pageHeading = activeCategory
    ? `${activeCategory.name} з нанесенням логотипу`
    : params.q
    ? `Пошук: «${params.q}»`
    : 'Каталог товарів під нанесення логотипу';

  const breadcrumbItems = [
    { name: 'Головна', url: SITE_URL },
    { name: 'Каталог', url: buildCanonical('/catalog') },
    ...(activeCategory
      ? [{ name: activeCategory.name, url: buildCanonical(`/catalog?category=${encodeURIComponent(activeCategory.slug)}`) }]
      : []),
  ];

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageHeading,
    numberOfItems: count,
    itemListElement: products.slice(0, 24).map((p: { title: string; slug: string }, idx: number) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: p.title,
      url: buildCanonical(`/product/${encodeURIComponent(p.slug)}`),
    })),
  };

  return (
    <div className="bg-background min-h-screen font-sans text-foreground transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <div className="container mx-auto px-4 py-8">

        {/* Хлібні крихти */}
        <div className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
          <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">Головна</Link> /
          <Link href="/catalog" className="text-gray-900 dark:text-white font-bold ml-1 hover:underline">Каталог</Link>
          {activeCategory && <span className="ml-1 text-gray-400"> / {activeCategory.name}</span>}
          {params.q && <span className="ml-1 text-gray-400"> / Пошук: "{params.q}"</span>}
        </div>

        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-6">
          {pageHeading}
        </h1>

        {/* --- КОНТЕНТ (Через Layout) --- */}
        <CatalogLayout
          products={products}
          categories={categories}
          availableColors={availableColors}
          maxPrice={50000}
          totalCount={count}
          searchParams={params}
          currentPage={page}
          totalPages={totalPages}
        />

        {/* Семантичний SEO-блок для пошукових запитів ніші */}
        <section className="mt-16 pt-10 border-t border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-gray-400 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {activeCategory
              ? `${activeCategory.name} з нанесенням логотипу оптом — REBRAND STUDIO`
              : 'Брендування одягу та корпоративної продукції оптом — REBRAND STUDIO'}
          </h2>
          <p>
            У B2B-каталозі <strong>REBRAND STUDIO</strong> ви можете замовити{' '}
            {activeCategory ? activeCategory.name.toLowerCase() : 'корпоративний одяг, текстиль, сумки та бізнес-сувеніри'}{' '}
            із професійним нанесенням логотипу оптом по всій Україні. Ми підбираємо оптимальний метод брендування під ваш тираж і тканину:
            <strong> DTF-друк</strong> (повноколірні стійкі принти), <strong>машинна вишивка</strong> (преміальний об&apos;ємний логотип),
            <strong> шовкографія</strong> (вигідна для середніх та великих партій) та <strong>термотрансфер</strong>.
          </p>
          <p>
            Спробуйте візуалізувати свій логотип на обраній моделі одразу в{' '}
            <Link href="/CONSTRUCTOR" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              онлайн-конструкторі брендування
            </Link>
            .
          </p>
        </section>

      </div>
    </div>
  );
}