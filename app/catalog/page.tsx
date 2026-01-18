import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
// import { ChevronLeft, ChevronRight } from 'lucide-react'; // Removed unused
import CatalogLayout from '@/components/CatalogLayout';

import { getProducts, SearchParams } from '@/lib/catalog';
import { COLOR_MAP } from '@/lib/colors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {

  const params = await searchParams;

  // Використовуємо спільну логіку для отримання товарів
  const { products, count, page, totalPages } = await getProducts(params);

  // Додаткові дані для сайдбару (Категорії)
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id')
    .order('name');

  const categories = categoriesData || [];

  // РОЗУМНЕ ВИЗНАЧЕННЯ КОЛЬОРІВ: Перевіряємо наявність для кожної групи з нашого довідника
  // Це набагато краще ніж limit(10000), бо ми гарантовано знайдемо всі доступні кольори
  const activeColorsCheck = await Promise.all(
    COLOR_MAP.map(async (group) => {
      const { count } = await supabase
        .from('product_variants')
        .select('id', { count: 'exact', head: true })
        .eq('general_color', group.key)
        .limit(1);
      return count && count > 0 ? group.key : null;
    })
  );

  const availableColors = activeColorsCheck.filter((c): c is string => c !== null);

  return (
    <div className="bg-background min-h-screen font-sans text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-8">

        {/* Хлібні крихти */}
        <div className="text-xs text-gray-500 mb-6 uppercase tracking-wider">
          <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">Головна</Link> /
          <span className="text-gray-900 dark:text-white font-bold ml-1">Каталог</span>
          {params.category && <span className="ml-1 text-gray-400"> / {params.category}</span>}
          {params.q && <span className="ml-1 text-gray-400"> / Пошук: "{params.q}"</span>}
        </div>

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


      </div>
    </div>
  );
}