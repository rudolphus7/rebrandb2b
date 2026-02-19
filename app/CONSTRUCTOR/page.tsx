import { getProducts, getCategories } from '@/lib/catalog';
import { createClient } from '@supabase/supabase-js';
import ConstructorClient from './components/ConstructorClient';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function ConstructorPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
    const params = await searchParams;
    const productSlug = params.product || null;

    // Fetch initial data
    const [productsData, categories] = await Promise.all([
        getProducts({ page: '1' }),
        getCategories()
    ]);

    // If a specific product slug was passed, fetch that product separately
    let preSelectedProduct = null;
    if (productSlug) {
        const { data: product } = await supabase
            .from('products')
            .select(`*, product_variants (*), product_images (*)`)
            .eq('slug', decodeURIComponent(productSlug))
            .single();

        if (product) {
            preSelectedProduct = product;
        }
    }

    return (
        <div className="constructor-container">
            <ConstructorClient
                initialProducts={productsData.products as any}
                categories={categories as any}
                preSelectedProduct={preSelectedProduct as any}
            />
        </div>
    );
}
