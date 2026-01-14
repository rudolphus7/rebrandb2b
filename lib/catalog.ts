import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const ITEMS_PER_PAGE = 24;

export interface SearchParams {
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    color?: string;
    page?: string;
    inStock?: string;
}

export async function getProducts(params: SearchParams) {
    const page = parseInt(params.page || '1');
    const queryText = params.q || '';
    const safeQueryText = queryText.replace(/[,%()]/g, ' ').trim();
    const categorySlug = params.category;
    const minPrice = parseFloat(params.minPrice || '0');
    const maxPrice = parseFloat(params.maxPrice || '1000000');
    const selectedColors = params.color?.split(',').filter(Boolean) || [];
    const onlyInStock = params.inStock === 'true';

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

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

    if (safeQueryText) {
        query = query.or(`title.ilike.%${safeQueryText}%,vendor_article.ilike.%${safeQueryText}%`);
    }

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

    if (minPrice > 0) query = query.gte('base_price', minPrice);
    if (params.maxPrice) query = query.lte('base_price', maxPrice);

    if (selectedColors.length > 0) {
        query = query.in('product_variants.general_color', selectedColors);
    }

    if (onlyInStock) {
        query = query.gt('product_variants.stock', 0);
    }

    const { data: rawProducts, count, error } = await query;

    if (error) {
        console.error("Catalog Error:", error);
        throw new Error(error.message);
    }

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

    return { products, count: count || 0, page, totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE) };
}
