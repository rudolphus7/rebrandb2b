import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CatalogLayout from '@/components/CatalogLayout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 24;

interface SearchParams {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  color?: string;
  page?: string;
  inStock?: string;
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {

  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const queryText = params.q || '';

  // 1. Очищаємо пошуковий запит від спецсимволів
  const safeQueryText = queryText.replace(/[,%()]/g, ' ').trim();

  const categorySlug = params.category;
  const minPrice = parseFloat(params.minPrice || '0');
  const maxPrice = parseFloat(params.maxPrice || '1000000');
  const selectedColors = params.color?.split(',').filter(Boolean) || [];

  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // 2. ОТРИМУЄМО ДАНІ ДЛЯ САЙДБАРУ (Категорії + Кольори)
  const [categoriesRes, colorsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, parent_id') // Важливо для дерева категорій
      .order('name'),

    supabase
      .from('product_variants')
      .select('general_color') // Використовуємо general_color для фільтрів
      .neq('general_color', 'Other')
      .neq('general_color', null)
      .limit(2000)
  ]);

  const categories = categoriesRes.data || [];
  // Збираємо унікальні загальні кольори
  const availableColors = Array.from(new Set(colorsRes.data?.map(i => i.general_color))).sort();

  // 3. БУДУЄМО ЗАПИТ НА ТОВАРИ
  const onlyInStock = params.inStock === 'true';

  let selectQuery = `
    *,
    categories (slug),
    product_variants (
      color,
      general_color,
      price,
      stock,
      available,
      image_url 
    )
  `;

  // Якщо є фільтр кольору АБО в наявності, використовуємо inner join
  if (selectedColors.length > 0 || onlyInStock) {
    selectQuery = `
        *,
        categories (slug),
        product_variants!inner (
          color,
          general_color,
          price,
          stock,
          available,
          image_url
        )
     `;
  }

  let query = supabase
    .from('products')
    .select(selectQuery, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  // --- ФІЛЬТРИ ---

  // Пошук
  if (safeQueryText) {
    query = query.or(`title.ilike.%${safeQueryText}%,vendor_article.ilike.%${safeQueryText}%`);
  }

  // Категорія
  if (categorySlug) {
    const { data: currentCat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
    if (currentCat) {
      const { data: subCats } = await supabase.from('categories').select('id').eq('parent_id', currentCat.id);
      const idsToFilter = [currentCat.id, ...(subCats?.map(c => c.id) || [])];
      query = query.in('category_id', idsToFilter);
    } else {
      query = query.eq('category_id', '00000000-0000-0000-0000-000000000000');
    }
  }

  // Ціна
  if (minPrice > 0) query = query.gte('base_price', minPrice);
  if (params.maxPrice) query = query.lte('base_price', maxPrice);

  // Колір
  if (selectedColors.length > 0) {
    query = query.in('product_variants.general_color', selectedColors);
  }

  // В наявності
  if (onlyInStock) {
    // We check if stock > 0. using product_variants!inner ensures we only get products that MATCH this condition
    query = query.gt('product_variants.stock', 0);
  }

  // ВИКОНАННЯ ЗАПИТУ
  const { data: rawProducts, count, error } = await query;

  if (error) {
    console.error("Catalog Error:", error);
    return <div className="p-10 text-red-500 text-center">Помилка завантаження: {error.message}</div>;
  }

  // 4. ОБРОБКА ДАНИХ ДЛЯ ВІДОБРАЖЕННЯ
  const products = rawProducts?.map((product: any) => {
    // Рахуємо залишки
    const totalAvailable = product.product_variants?.reduce(
      (sum: number, variant: any) => sum + (variant.available ?? variant.stock ?? 0),
      0
    );

    // Групуємо варіанти для міні-фото (унікальні по кольору)
    const uniqueVariantsMap = new Map();
    product.product_variants?.forEach((v: any) => {
      if (v.color && v.color !== 'N/A' && v.image_url) {
        if (!uniqueVariantsMap.has(v.color)) {
          uniqueVariantsMap.set(v.color, { color: v.color, image: v.image_url });
        }
      }
    });
    const displayVariants = Array.from(uniqueVariantsMap.values());
    const productColors = Array.from(new Set(product.product_variants?.map((v: any) => v.color).filter((c: any) => c !== 'N/A')));

    return {
      ...product,
      total_available: totalAvailable,
      display_variants: displayVariants,
      colors: productColors
    };
  }) || [];

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const createPageUrl = (newPage: number) => {
    const newParams = new URLSearchParams();
    if (params.q) newParams.set('q', params.q);
    if (params.category) newParams.set('category', params.category);
    if (params.minPrice) newParams.set('minPrice', params.minPrice);
    if (params.maxPrice) newParams.set('maxPrice', params.maxPrice);
    if (params.color) newParams.set('color', params.color);
    newParams.set('page', newPage.toString());
    return `/catalog?${newParams.toString()}`;
  };

  return (
    <div className="bg-background min-h-screen font-sans text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-8">

        {/* Хлібні крихти */}
        <div className="text-xs text-gray-500 mb-6 uppercase tracking-wider">
          <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">Головна</Link> /
          <span className="text-gray-900 dark:text-white font-bold ml-1">Каталог</span>
          {categorySlug && <span className="ml-1 text-gray-400"> / {categorySlug}</span>}
          {queryText && <span className="ml-1 text-gray-400"> / Пошук: "{queryText}"</span>}
        </div>

        {/* --- КОНТЕНТ (Через Layout) --- */}
        <CatalogLayout
          products={products}
          categories={categories}
          availableColors={availableColors}
          maxPrice={50000}
          totalCount={count || 0}
        />

        {/* ПАГІНАЦІЯ */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center gap-4 pb-12">
            <Link
              href={hasPrevPage ? createPageUrl(page - 1) : '#'}
              className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${!hasPrevPage ? 'border-gray-200 dark:border-white/10 text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'}`}
            >
              <ChevronLeft size={20} />
            </Link>

            <div className="text-sm font-medium text-gray-500">
              Сторінка <span className="text-black dark:text-white font-bold">{page}</span> з {totalPages}
            </div>

            <Link
              href={hasNextPage ? createPageUrl(page + 1) : '#'}
              className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${!hasNextPage ? 'border-gray-200 dark:border-white/10 text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'}`}
            >
              <ChevronRight size={20} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}