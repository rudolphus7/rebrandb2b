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

// Helper to apply common filters
// Helper to separate Async Category Logic
const resolveCategoryIds = async (categorySlug: string | undefined, supabase: any) => {
    if (!categorySlug) return null;

    const { data: currentCat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
    if (currentCat) {
        const { data: subCats } = await supabase.from('categories').select('id').eq('parent_id', currentCat.id);
        return [currentCat.id, ...(subCats?.map((c: any) => c.id) || [])];
    }
    return []; // Empty array triggers "force empty" logic
};

export async function getProducts(params: SearchParams) {
    const page = parseInt(params.page || '1');
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // 1. Resolve Category IDs (Async Step)
    const categoryIds = await resolveCategoryIds(params.category, supabase);

    // 2. Define Sync Query BuilderFactory
    const createBaseQuery = (selectStr: string, opts: any = { count: 'exact' }) => {
        let q = supabase.from('products').select(selectStr, opts);

        // Apply Common Filters (Sync)
        const queryText = params.q || '';
        const safeQueryText = queryText.replace(/[,%()]/g, ' ').trim();
        const minPrice = parseFloat(params.minPrice || '0');
        const maxPrice = parseFloat(params.maxPrice || '1000000');
        const selectedColors = params.color?.split(',').filter(Boolean) || [];
        const onlyInStock = params.inStock === 'true';

        if (safeQueryText) {
            q = q.or(`title.ilike.%${safeQueryText}%,vendor_article.ilike.%${safeQueryText}%`);
        }

        if (categoryIds !== null) {
            if (categoryIds.length > 0) {
                q = q.in('category_id', categoryIds);
            } else {
                q = q.eq('category_id', '00000000-0000-0000-0000-000000000000'); // Valid category slug but no category found
            }
        }

        if (minPrice > 0) q = q.gte('base_price', minPrice);
        if (params.maxPrice) q = q.lte('base_price', maxPrice);

        if (selectedColors.length > 0) {
            q = q.in('product_variants.general_color', selectedColors);
        }

        if (onlyInStock) {
            q = q.gt('product_variants.stock', 0);
        }

        return q;
    };

    // 3. Get TOTAL Count (Valid + Zeros)
    // We use 'head: true' to avoid fetching data, just count.
    const { count: totalCount, error: countError } = await createBaseQuery('id', { count: 'exact', head: true });

    if (countError) throw new Error(countError.message);

    // 4. Get Valid Count (Price > 0)
    const { count: validCountOrNull, error: validError } = await createBaseQuery('id', { count: 'exact', head: true })
        .gt('base_price', 0);

    if (validError) throw new Error(validError.message);
    const validCount = validCountOrNull || 0;

    let rawProducts: any[] = [];

    // 5. Select Fields Logic
    const selectFields = (params.color?.length || params.inStock === 'true')
        ? `*, categories(slug), product_variants!inner(color, general_color, price, stock, available, image_url)`
        : `*, categories(slug), product_variants(color, general_color, price, stock, available, image_url)`;


    // 6. Determine Fetch Strategy
    // Scenario A: Request is fully within Valid Items
    if (to < validCount) {
        const { data } = await createBaseQuery(selectFields)
            .gt('base_price', 0)
            .order('created_at', { ascending: false })
            .range(from, to);
        rawProducts = data || [];
    }
    // Scenario B: Request is fully within Zero Items
    else if (from >= validCount) {
        const offset = from - validCount;
        const limit = to - from;
        const { data } = await createBaseQuery(selectFields)
            .eq('base_price', 0)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit);
        rawProducts = data || [];
    }
    // Scenario C: Request overlaps
    else {
        // Part 1: Remaining Valid items
        const validEnd = validCount - 1;
        const { data: dataValid } = await createBaseQuery(selectFields)
            .gt('base_price', 0)
            .order('created_at', { ascending: false })
            .range(from, validEnd);

        // Part 2: Starting Zero items
        const zeroStart = 0;
        const itemsNeeded = (to - from + 1) - (dataValid?.length || 0);
        const zeroEnd = itemsNeeded - 1;

        const { data: dataZero } = await createBaseQuery(selectFields)
            .eq('base_price', 0)
            .order('created_at', { ascending: false })
            .range(zeroStart, zeroEnd);

        rawProducts = [...(dataValid || []), ...(dataZero || [])];
    }


    // 6. Map and Return (Existing Logic)
    const products = rawProducts.map((product: any) => {
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
    });

    return { products, count: totalCount || 0, page, totalPages: Math.ceil((totalCount || 0) / ITEMS_PER_PAGE) };
}
