import Header from "@/components/Header";
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
  
  // 1. Розпаковуємо параметри (Next.js 15)
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const queryText = params.q || '';
  const categorySlug = params.category;
  const minPrice = parseFloat(params.minPrice || '0');
  const maxPrice = parseFloat(params.maxPrice || '1000000');
  const selectedColors = params.color?.split(',').filter(Boolean) || [];

  // Розраховуємо діапазон для пагінації
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // 2. Отримуємо дані для САЙДБАРУ (Категорії + Унікальні кольори)
  // Виконуємо паралельно для швидкості
  const [categoriesRes, colorsRes] = await Promise.all([
    // ВАЖЛИВО: Додали parent_id
    supabase.from('categories').select('id, name, slug, parent_id').order('name'), 
    supabase.from('product_variants').select('color').neq('color', 'N/A').limit(2000) 
]);

  const categories = categoriesRes.data || [];
  
  // Формуємо список унікальних кольорів з бази
  const availableColors = Array.from(new Set(colorsRes.data?.map(i => i.color))).sort();

  // 3. БУДУЄМО ЗАПИТ НА ТОВАРИ
  
  // Базовий вибір полів. 
  // Важливо: ми беремо image_url з варіантів, щоб показати фото різних кольорів
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

  // Якщо фільтруємо по кольору -> використовуємо !inner (жорсткий зв'язок)
  // Це означає: "Дай мені товари, у яких Є варіант з таким кольором"
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

  // --- ЗАСТОСУВАННЯ ФІЛЬТРІВ ---
  
  // Пошук
  if (queryText) {
    query = query.or(`title.ilike.%${queryText}%,vendor_article.ilike.%${queryText}%`);
  }

  // Категорія
  if (categorySlug) {
    // Використовуємо !inner для фільтрації по зв'язаній таблиці categories
    // Замінюємо в запиті частину рядка
    const queryWithCategoryFilter = selectQuery.replace('categories (slug)', 'categories!inner(slug)');
    query = supabase
        .from('products')
        .select(queryWithCategoryFilter, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
        .eq('categories.slug', categorySlug);
    
    // Повторно накладаємо фільтр кольору, якщо він був, бо ми перезаписали query
    if (selectedColors.length > 0) {
        query = query.in('product_variants.color', selectedColors);
    }
  }

  // Ціна
  if (minPrice > 0) query = query.gte('base_price', minPrice);
  if (params.maxPrice) query = query.lte('base_price', maxPrice);

  // Колір (DB Filter)
  if (selectedColors.length > 0) {
    query = query.in('product_variants.color', selectedColors);
  }

  // ВИКОНАННЯ ЗАПИТУ
  const { data: rawProducts, count, error } = await query;

  if (error) {
    console.error("Catalog Error:", error);
    return <div className="p-10 text-red-500 text-center">Помилка завантаження: {error.message}</div>;
  }

  // 4. POST-PROCESSING (Обробка даних для відображення)
  const products = rawProducts?.map((product: any) => {
    // 1. Рахуємо загальний вільний залишок
    const totalAvailable = product.product_variants?.reduce(
      (sum: number, variant: any) => sum + (variant.available ?? variant.stock ?? 0), 
      0
    );

    // 2. Збираємо варіанти для відображення (міні-фото)
    // Використовуємо Map, щоб кольори не дублювались (наприклад, якщо є S і M одного кольору)
    const uniqueVariantsMap = new Map();
    
    product.product_variants?.forEach((v: any) => {
       // Беремо тільки ті, де є колір і фото
       if (v.color && v.color !== 'N/A' && v.image_url) {
          if (!uniqueVariantsMap.has(v.color)) {
             uniqueVariantsMap.set(v.color, { color: v.color, image: v.image_url });
          }
       }
    });

    const displayVariants = Array.from(uniqueVariantsMap.values());

    // 3. Список кольорів для фільтрації в ProductCard (якщо треба)
    const productColors = Array.from(new Set(product.product_variants?.map((v: any) => v.color).filter((c: any) => c !== 'N/A')));

    return {
      ...product,
      total_available: totalAvailable,
      display_variants: displayVariants, // <-- Це піде в кружечки/фото
      colors: productColors
    };
  }) || [];


  // --- ПАГІНАЦІЯ ---
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
      <Header />
      <div className="container mx-auto px-4 py-8">
        
        {/* Хлібні крихти (спрощені) */}
        <div className="text-xs text-gray-500 mb-6 uppercase tracking-wider">
    <Link href="/" className="hover:text-white transition-colors">Головна</Link> / 
    <span className="text-white font-bold ml-1">Каталог</span>
            {categorySlug && <span className="ml-1"> / {categories.find((c: any) => c.slug === categorySlug)?.name}</span>}
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
            <div className="bg-[#1a1a1a] rounded-2xl p-4 shadow-sm border border-white/10 mb-6 flex flex-wrap justify-between items-center gap-4">
               
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Filter size={16} />
                      <span>Знайдено:</span>
                  </div>
                  <span className="font-bold text-white bg-white/10 px-3 py-1 rounded-full text-sm">{count || 0}</span>
               </div>

               {/* Таби сортування (візуальні) */}
               <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto scrollbar-hide">
                 {['Акція', 'Новинка', 'Хіт продажу', 'Розпродаж'].map(tab => (
                   <button key={tab} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition-all whitespace-nowrap border border-transparent hover:border-gray-200">
                     {tab}
                   </button>
                 ))}
               </div>
            </div>

            {/* СІТКА ТОВАРІВ */}
            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Filter size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-bold text-lg">Товарів не знайдено</p>
                    <p className="text-sm text-gray-500 mt-1">Спробуйте змінити параметри пошуку</p>
                    <Link href="/catalog" className="mt-4 text-blue-600 font-bold text-sm hover:underline">
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
                            className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${!hasPrevPage ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-black hover:bg-black hover:text-white hover:border-black'}`}
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        
                        <div className="text-sm font-medium text-gray-500">
                            Сторінка <span className="text-black font-bold">{page}</span> з {totalPages}
                        </div>

                        <Link 
                            href={hasNextPage ? createPageUrl(page + 1) : '#'}
                            className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${!hasNextPage ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-black hover:bg-black hover:text-white hover:border-black'}`}
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