import ProductCard from '@/components/ProductCard';
import { CatalogSidebar } from '@/components/CatalogSidebar';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

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
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const queryText = params.q || '';
  
  // --- ФІКС ПОМИЛКИ ---
  // Видаляємо коми та інші спецсимволи, щоб не ламати запит Supabase
  // "Реглани, фліси" перетвориться на "Реглани  фліси"
  const safeQueryText = queryText.replace(/[,%()]/g, ' ').trim();

  const categorySlug = params.category;
  const minPrice = parseFloat(params.minPrice || '0');
  const maxPrice = parseFloat(params.maxPrice || '1000000');
  const selectedColors = params.color?.split(',').filter(Boolean) || [];

  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // 2. ОТРИМУЄМО ДАНІ ДЛЯ САЙДБАРУ
  const [categoriesRes, colorsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, parent_id')
      .order('name'),
    
    supabase
      .from('product_variants')
      .select('color')
      .neq('color', 'N/A')
      .limit(2000) 
  ]);

  const categories = categoriesRes.data || [];
  const availableColors = Array.from(new Set(colorsRes.data?.map(i => i.color))).sort();

  // 3. БУДУЄМО ЗАПИТ НА ТОВАРИ
  let selectQuery = `
    *,
    categories (slug),
    product_variants (
      color,
      price,
      stock,
      available,
      image_url 
    )
  `;

  if (selectedColors.length > 0) {
     selectQuery = `
        *,
        categories (slug),
        product_variants!inner (
          color,
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
  
  // Пошук (ВИПРАВЛЕНО)
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
    query = query.in('product_variants.color', selectedColors);
  }

  // ВИКОНАННЯ ЗАПИТУ
  const { data: rawProducts, count, error } = await query;

  if (error) {
    console.error("Catalog Error:", error);
    return <div className="p-10 text-red-500 text-center">Помилка завантаження: {error.message}</div>;
  }

  // 4. POST-PROCESSING
  const products = rawProducts?.map((product: any) => {
    const totalAvailable = product.product_variants?.reduce(
      (sum: number, variant: any) => sum + (variant.available ?? variant.stock ?? 0), 
      0
    );

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
    <div className="bg-[#111] min-h-screen font-sans text-white">
      <div className="container mx-auto px-4 py-8">
        
        {/* Хлібні крихти */}
        <div className="text-xs text-gray-500 mb-6 uppercase tracking-wider">
            <Link href="/" className="hover:text-white transition-colors">Головна</Link> / 
            <span className="text-white font-bold ml-1">Каталог</span>
            {categorySlug && <span className="ml-1 text-gray-400"> / {categorySlug}</span>}
            {queryText && <span className="ml-1 text-gray-400"> / Пошук: "{queryText}"</span>}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* --- САЙДБАР --- */}
          <CatalogSidebar 
             categories={categories}
             availableColors={availableColors}
             maxPrice={50000} 
          />

          {/* --- ОСНОВНИЙ КОНТЕНТ --- */}
          <div className="flex-1">
            
            {/* Верхня панель */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 shadow-sm border border-white/10 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Filter size={16} />
                      <span>Знайдено:</span>
                  </div>
                  <span className="font-bold text-white bg-white/10 px-3 py-1 rounded-full text-sm">{count || 0}</span>
               </div>
            </div>

            {/* СІТКА ТОВАРІВ */}
            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-[#1a1a1a] rounded-3xl border border-dashed border-white/10">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <Filter size={24} className="text-gray-500" />
                    </div>
                    <p className="text-white font-bold text-lg">Товарів не знайдено</p>
                    <p className="text-sm text-gray-500 mt-1">Спробуйте змінити параметри пошуку</p>
                    <Link href="/catalog" className="mt-4 text-blue-500 font-bold text-sm hover:underline">
                        Скинути всі фільтри
                    </Link>
                </div>
            ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {products.map((product: any) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {/* ПАГІНАЦІЯ */}
                  {totalPages > 1 && (
                      <div className="mt-12 flex justify-center items-center gap-4">
                        <Link 
                            href={hasPrevPage ? createPageUrl(page - 1) : '#'}
                            className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${!hasPrevPage ? 'border-white/10 text-gray-600 cursor-not-allowed' : 'border-white/20 text-white hover:bg-white hover:text-black'}`}
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        
                        <div className="text-sm font-medium text-gray-500">
                            Сторінка <span className="text-white font-bold">{page}</span> з {totalPages}
                        </div>

                        <Link 
                            href={hasNextPage ? createPageUrl(page + 1) : '#'}
                            className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${!hasNextPage ? 'border-white/10 text-gray-600 cursor-not-allowed' : 'border-white/20 text-white hover:bg-white hover:text-black'}`}
                        >
                            <ChevronRight size={20} />
                        </Link>
                      </div>
                  )}
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}