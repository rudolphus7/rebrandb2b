import type { Metadata } from 'next';
import { getProducts, getCategories } from '@/lib/catalog';
import { createClient } from '@supabase/supabase-js';
import ConstructorClient from './components/ConstructorClient';
import { buildCanonical } from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Онлайн-конструктор нанесення логотипу на одяг та мерч',
    description:
        'Створіть макет брендованого одягу онлайн у конструкторі REBRAND STUDIO: завантажте логотип, оберіть місце нанесення, розмір та метод друку (DTF, вишивка, шовкографія, термотрансфер).',
    alternates: {
        canonical: buildCanonical('/CONSTRUCTOR'),
    },
};

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
