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
    label?: string;
}

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
        // Apply Common Filters (Sync)
        const queryText = params.q || '';
        const safeQueryText = queryText.replace(/[,%()]/g, ' ').trim();
        const minPrice = parseFloat(params.minPrice || '0');
        const maxPrice = parseFloat(params.maxPrice || '1000000');
        const selectedColors = params.color?.split(',').filter(Boolean) || [];
        const onlyInStock = params.inStock === 'true';

        // Check if we are filtering by variants
        const filteringVariants = selectedColors.length > 0 || onlyInStock;

        // Fix: If filtering by variants (color or stock), we MUST include the relation in the select
        // even for count queries. If selectStr is just 'id', we append the inner join.
        let finalSelect = selectStr;
        if (filteringVariants && selectStr === 'id') {
            // Use products.id to avoid ambiguity and ensure inner join works for counting
            finalSelect = 'id, product_variants!inner(id)';
        }

        let q = supabase.from('products').select(finalSelect, opts);

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
            // Robust stock filtering: try available, fallback to stock if possible
            // Note: PostgREST doesn't support easy fallback in .gt, 
            // but we'll use 'available' as the primary since we are adding it via migration.
            q = q.gt('product_variants.available', 0);
        }

        if (params.label) {
            q = q.eq('label', params.label);
        }

        return q;
    };

    let totalCount = 0;
    let validCount = 0;

    try {
        const [totalCountRes, validCountRes] = await Promise.all([
            createBaseQuery('id', { count: 'exact', head: true }),
            createBaseQuery('id', { count: 'exact', head: true }).gt('base_price', 0)
        ]);

        if (totalCountRes.error) {
            console.error("Total Count Error:", totalCountRes.error);
            // Fallback: try without variant filtering if it failed
            if (params.inStock === 'true' || params.color) {
                console.warn("Retrying count without variant filters...");
                const fallbackRes = await supabase.from('products').select('id', { count: 'exact', head: true });
                totalCount = fallbackRes.count || 0;
            } else {
                throw totalCountRes.error;
            }
        } else {
            totalCount = totalCountRes.count || 0;
        }

        if (validCountRes.error) {
            console.error("Valid Count Error:", validCountRes.error);
            validCount = totalCount; // Simplified fallback
        } else {
            validCount = validCountRes.count || 0;
        }
    } catch (err) {
        console.error("Critical Count Error:", err);
        // Don't crash the whole page, return 0 counts
    }

    let rawProducts: any[] = [];

    const baseFields = 'id, title, slug, base_price, old_price, image_url, vendor_article, label, created_at';
    const selectedColors = params.color?.split(',').filter(Boolean) || [];
    const filteringVariants = selectedColors.length > 0 || params.inStock === 'true';

    const selectFields = filteringVariants
        ? `${baseFields}, categories(slug), product_variants!inner(color, general_color, price, stock, available, image_url)`
        : `${baseFields}, categories(slug), product_variants(color, general_color, price, stock, available, image_url)`;


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

        // We can ALSO parallelize these two data fetches if we are in Scenario C!
        const offset = 0;
        const limitZero = (to - from + 1) - (validEnd - from + 1); // itemsNeeded
        const zeroEnd = limitZero - 1;

        const [validDataRes, zeroDataRes] = await Promise.all([
            createBaseQuery(selectFields)
                .gt('base_price', 0)
                .order('created_at', { ascending: false })
                .range(from, validEnd),
            createBaseQuery(selectFields)
                .eq('base_price', 0)
                .order('created_at', { ascending: false })
                .range(offset, zeroEnd)
        ]);

        rawProducts = [...(validDataRes.data || []), ...(zeroDataRes.data || [])];
    }


    // 6. Map and Return (Enhanced with inStock filtering)
    const onlyInStock = params.inStock === 'true';

    const products = rawProducts.map((product: any) => {
        // Filter variants if onlyInStock is requested
        let variants = product.product_variants || [];
        if (onlyInStock) {
            variants = variants.filter((v: any) => (v.available ?? v.stock ?? 0) > 0);
        }

        const totalAvailable = variants.reduce(
            (sum: number, variant: any) => sum + (variant.available ?? variant.stock ?? 0),
            0
        );

        const uniqueVariantsMap = new Map();
        variants.forEach((v: any) => {
            if (v.color && v.color !== 'N/A' && v.image_url) {
                if (!uniqueVariantsMap.has(v.color)) {
                    uniqueVariantsMap.set(v.color, { color: v.color, image: v.image_url });
                }
            }
        });
        const displayVariants = Array.from(uniqueVariantsMap.values());
        const productColors = Array.from(new Set(variants.map((v: any) => v.color).filter((c: any) => c !== 'N/A')));

        // PRIORITY 1: If filtering by color, pick a variant image matching that color
        let defaultImage = product.image_url;
        if (selectedColors.length > 0) {
            const prioritizedVariant = variants.find((v: any) => selectedColors.includes(v.general_color));
            if (prioritizedVariant?.image_url) {
                defaultImage = prioritizedVariant.image_url;
            }
        }
        // PRIORITY 2: If filtering by stock, ensure image is from an available variant
        else if (onlyInStock && displayVariants.length > 0) {
            const availableImages = displayVariants.map(v => v.image);
            if (!availableImages.includes(product.image_url)) {
                defaultImage = availableImages[0];
            }
        }

        return {
            ...product,
            image_url: defaultImage,
            total_available: totalAvailable,
            display_variants: displayVariants,
            colors: productColors
        };
    });

    return { products, count: totalCount || 0, page, totalPages: Math.ceil((totalCount || 0) / ITEMS_PER_PAGE) };
}
