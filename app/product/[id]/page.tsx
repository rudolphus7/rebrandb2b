import { createClient } from '@supabase/supabase-js';
import ProductClient from '@/components/ProductClient';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
        product_variants (*)
    `)
    .eq('slug', decodedSlug)
    .single();

  if (error || !product) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Товар не знайдено</h1>
                <p className="text-gray-500 mt-2">Перевірте правильність посилання</p>
            </div>
        </div>
    );
  }

  return <ProductClient product={product} variants={product.product_variants} />;
}