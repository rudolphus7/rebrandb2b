import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import { detectGeneralColor } from '@/lib/colors';
import { getAuthenticatedUser, isAdminUser } from '@/lib/serverAuth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: { persistSession: false },
        db: { schema: 'public' }
    }
);

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
});

const BATCH_SIZE = 10;
const TIME_LIMIT = 50000;

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    const authHeader = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const manualKey = searchParams.get('key');

    // Перевірка авторизації (CRON_SECRET, dev-режим або авторизований адмін)
    const hasSecret =
        Boolean(process.env.CRON_SECRET) &&
        (authHeader === `Bearer ${process.env.CRON_SECRET}` || manualKey === process.env.CRON_SECRET);

    const isDev = process.env.NODE_ENV === 'development';
    let isAdmin = false;

    if (!hasSecret && !isDev) {
        const user = await getAuthenticatedUser();
        if (user) {
            isAdmin = await isAdminUser(user.id);
        }
    }

    if (!hasSecret && !isDev && !isAdmin) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const specificSupplier = searchParams.get('supplier');

        console.log('--- START SYNC (DEBUG MODE) ---');

        const { data: allCategories } = await supabase
            .from('categories')
            .select('id, match_keywords');

        let query = supabase.from('suppliers').select('*').eq('is_active', true);
        if (specificSupplier) query = query.eq('name', specificSupplier);

        const { data: suppliers, error: supplierError } = await query;
        if (supplierError || !suppliers) throw new Error('Failed to fetch suppliers');

        const results = [];

        for (const supplier of suppliers) {
            if (Date.now() - startTime > TIME_LIMIT) {
                results.push({ supplier: supplier.name, status: 'skipped_timeout' });
                break;
            }

            console.log(`\n🚀 Starting sync for: ${supplier.name}`);

            const { data: rules } = await supabase.from('sync_rules').select('*').eq('supplier_id', supplier.id);
            const manualCategoryMap: Record<string, string> = {};
            rules?.forEach(r => { manualCategoryMap[r.external_category_id] = r.internal_category_id; });

            const response = await fetch(supplier.url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' },
                signal: AbortSignal.timeout(40000)
            });

            if (!response.ok) { console.error(`❌ Failed to fetch ${supplier.name}`); continue; }

            const textData = await response.text();
            const xmlData = parser.parse(textData);

            let processedCount = 0;

            // ==========================================
            // TOTOBI
            // ==========================================
            if (supplier.name === 'Totobi') {
                const offers = xmlData.yml_catalog?.shop?.offers?.offer || [];
                const offersArray = Array.isArray(offers) ? offers : [offers];

                // 🕵️ ШПИГУН: Шукаємо ту саму "сіру косметичку", щоб побачити її нутрощі
                // Це виведе в лог Vercel повну структуру товару.
                const spyItem = offersArray.find((o: any) =>
                    o.name && o.name.toLowerCase().includes('косметичка') && o.name.toLowerCase().includes('сіра')
                );
                if (spyItem) {
                    console.log('🕵️ SPY FOUND (RAW XML DATA):', JSON.stringify(spyItem, null, 2));
                }

                const groupedOffers: Record<string, any[]> = {};
                offersArray.forEach((offer: any) => {
                    if (!offer.name) return;
                    const groupKey = offer.name.trim();
                    if (!groupedOffers[groupKey]) groupedOffers[groupKey] = [];
                    groupedOffers[groupKey].push(offer);
                });

                const groups = Object.values(groupedOffers);

                for (let i = 0; i < groups.length; i += BATCH_SIZE) {
                    if (Date.now() - startTime > TIME_LIMIT) { break; }
                    const chunk = groups.slice(i, i + BATCH_SIZE);

                    await Promise.all(chunk.map(async (group) => {
                        try {
                            const mainOffer = group[0];

                            let finalCatId: string | null = manualCategoryMap[mainOffer.categoryId] || null;
                            if (!finalCatId && allCategories) {
                                finalCatId = detectCategory(mainOffer.name, allCategories);
                            }

                            const { material, specs, brandParam } = extractTotobiParams(mainOffer.param);
                            const mainImage = Array.isArray(mainOffer.picture) ? mainOffer.picture[0] : mainOffer.picture;

                            let rawPrice = safeFloat(mainOffer.price);
                            if (rawPrice === 0 && mainOffer.sizes && mainOffer.sizes.size) {
                                const sizes = Array.isArray(mainOffer.sizes.size) ? mainOffer.sizes.size : [mainOffer.sizes.size];
                                const prices = sizes.map((s: any) => safeFloat(s['@_modifier'])).filter((p: number) => p > 0);
                                if (prices.length > 0) rawPrice = Math.min(...prices);
                            }
                            const finalBasePrice = Math.ceil(rawPrice);
                            const finalOldPrice = safeFloat(mainOffer.oldprice) > 0 ? Math.ceil(safeFloat(mainOffer.oldprice)) : null;

                            const { data: product } = await supabase
                                .from('products')
                                .upsert({
                                    title: mainOffer.name,
                                    slug: slugify(mainOffer.name),
                                    description: mainOffer.description,
                                    base_price: finalBasePrice,
                                    old_price: finalOldPrice,
                                    category_id: finalCatId,
                                    vendor_article: mainOffer.vendorCode,
                                    brand: brandParam || mainOffer.vendor,
                                    material: material,
                                    specifications: specs,
                                    image_url: mainImage,
                                    supplier_id: supplier.id,
                                    updated_at: new Date().toISOString()
                                }, { onConflict: 'slug' })
                                .select('id')
                                .single();

                            if (product) {
                                const variantsData: any[] = [];
                                for (const offer of group) {
                                    const color = extractColor(offer.param);
                                    const generalColor = detectGeneralColor(color);
                                    const variantImage = Array.isArray(offer.picture) ? offer.picture[0] : offer.picture;

                                    if (offer.sizes && offer.sizes.size) {
                                        const sizes = Array.isArray(offer.sizes.size) ? offer.sizes.size : [offer.sizes.size];
                                        for (const sizeObj of sizes) {
                                            let vPrice = safeFloat(sizeObj['@_modifier'] || offer.price);
                                            if (vPrice === 0) vPrice = finalBasePrice;

                                            // Використовуємо нову функцію, яка шукає навіть в параметрах
                                            const { stock, available } = getSmartStock(sizeObj, offer.param);

                                            variantsData.push({
                                                product_id: product.id,
                                                supplier_sku: sizeObj['@_product_code'],
                                                size: sizeObj['#text'],
                                                color: color,
                                                general_color: generalColor,
                                                price: Math.ceil(vPrice),
                                                stock: stock,
                                                available: available,
                                                image_url: variantImage,
                                                sku: sizeObj['@_product_code']
                                            });
                                        }
                                    } else {
                                        let vPrice = safeFloat(offer.price);
                                        if (vPrice === 0) vPrice = finalBasePrice;

                                        const { stock, available } = getSmartStock(offer, offer.param);

                                        variantsData.push({
                                            product_id: product.id,
                                            supplier_sku: offer.vendorCode,
                                            size: 'One Size',
                                            color: color,
                                            general_color: generalColor,
                                            price: Math.ceil(vPrice),
                                            stock: stock,
                                            available: available,
                                            image_url: variantImage,
                                            sku: offer.vendorCode
                                        });
                                    }
                                }
                                if (variantsData.length > 0) {
                                    await supabase.from('product_variants').upsert(variantsData, { onConflict: 'supplier_sku' });
                                }
                            }
                        } catch (e: any) { console.error(e); }
                    }));
                    processedCount += chunk.length;
                }
            }

            // ==========================================
            // TOPTIME (Без змін)
            // ==========================================
            else if (supplier.name === 'TopTime') {
                const items = xmlData.items?.item || xmlData.catalog?.items?.item || [];
                const itemsArray = Array.isArray(items) ? items : [items];

                const groupedItems: Record<string, any[]> = {};
                itemsArray.forEach((item: any) => {
                    if (!item.article) return;
                    const modelKey = item.article.split(' ')[0];
                    if (!groupedItems[modelKey]) groupedItems[modelKey] = [];
                    groupedItems[modelKey].push(item);
                });

                const groupsArray = Object.entries(groupedItems);

                for (let i = 0; i < groupsArray.length; i += BATCH_SIZE) {
                    if (Date.now() - startTime > TIME_LIMIT) { break; }
                    const chunk = groupsArray.slice(i, i + BATCH_SIZE);

                    await Promise.all(chunk.map(async ([modelKey, variants]) => {
                        try {
                            const firstVariant = (variants as any[])[0];
                            const cleanTitle = `${firstVariant.brand} ${firstVariant.name.split(',')[0]}`.trim();

                            let finalCatId: string | null = manualCategoryMap[firstVariant.id_category] || null;
                            if (!finalCatId && allCategories) {
                                finalCatId = detectCategory(cleanTitle + ' ' + (firstVariant.category_name || ''), allCategories);
                            }

                            const basePriceEur = safeFloat(firstVariant.price);
                            const rate = Number(supplier.rate) || 1;
                            const markup = Number(supplier.markup_percent) || 0;
                            const finalPriceUAH = Math.ceil(basePriceEur * rate * (1 + markup / 100));

                            const specs: Record<string, string> = {};
                            if (firstVariant.density_ua) specs['Щільність'] = firstVariant.density_ua;
                            if (firstVariant.sex_ua) specs['Стать'] = firstVariant.sex_ua;

                            const { data: product } = await supabase.from('products').upsert({
                                title: cleanTitle.substring(0, 255),
                                slug: slugify(`${firstVariant.brand}-${modelKey}`),
                                description: firstVariant.content_ua || firstVariant.content,
                                base_price: finalPriceUAH,
                                category_id: finalCatId,
                                brand: firstVariant.brand,
                                material: firstVariant.material_ua,
                                specifications: specs,
                                vendor_article: modelKey,
                                image_url: firstVariant.photo,
                                supplier_id: supplier.id,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'slug' }).select('id').single();

                            if (product) {
                                const variantsData = (variants as any[]).map(v => {
                                    const stockUA = parseInt(v.count3 || '0');
                                    const availableUA = parseInt(v.count2 || '0');
                                    const color = v.color || 'Standard';
                                    const generalColor = detectGeneralColor(color);

                                    return {
                                        product_id: product.id,
                                        supplier_sku: v.code,
                                        size: v.size || 'One Size',
                                        color: color,
                                        general_color: generalColor,
                                        price: finalPriceUAH,
                                        stock: stockUA,
                                        available: availableUA,
                                        image_url: v.photo,
                                        sku: v.code
                                    };
                                });
                                await supabase.from('product_variants').upsert(variantsData, { onConflict: 'supplier_sku' });
                            }
                        } catch (e: any) { console.error(e); }
                    }));
                    processedCount += chunk.length;
                }
            }

            results.push({ supplier: supplier.name, processed: processedCount });
            console.log(`✅ Finished ${supplier.name}. Processed: ${processedCount}`);
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// --- ХЕЛПЕРИ ---

function detectCategory(productName: string, categories: any[]): string | null {
    if (!productName) return null;
    const cleanedName = productName.toLowerCase().replace(/[^a-zа-яіїєґ\s]/g, '');
    let bestMatchId = null;
    let bestMatchLength = 0;
    for (const cat of categories) {
        if (cat.match_keywords && Array.isArray(cat.match_keywords)) {
            for (const keyword of cat.match_keywords) {
                const lowerKeyword = keyword.toLowerCase();
                if (cleanedName.includes(lowerKeyword)) {
                    if (lowerKeyword.length > bestMatchLength) {
                        bestMatchLength = lowerKeyword.length;
                        bestMatchId = cat.id;
                    }
                }
            }
        }
    }
    return bestMatchId;
}

function slugify(text: string) {
    if (!text) return 'unknown-' + Math.random().toString(36).substr(2, 9);
    return text.toString().toLowerCase().replace(/[\s\/\\]+/g, '-').replace(/[^\w\-а-яіїєґ]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}
function safeFloat(val: any): number { const parsed = parseFloat(val); return isNaN(parsed) ? 0 : parsed; }
function extractTotobiParams(params: any) {
    let material = null, brandParam = null, specs: any = {};
    if (!params) return { material, specs, brandParam };
    const arr = Array.isArray(params) ? params : [params];
    arr.forEach((p: any) => {
        const name = p['@_name'], value = p['#text'];
        if (!name || !value) return;
        if (name === 'Матеріал' || name === 'Material') material = value;
        else if (name === 'ТМ' || name === 'Бренд') brandParam = value;
        else if (name !== 'Колір' && name !== 'Розмір') specs[name] = value;
    });
    return { material, specs, brandParam };
}
function extractColor(params: any): string {
    if (!params) return 'N/A';
    const arr = Array.isArray(params) ? params : [params];
    const colorParam = arr.find((p: any) => p['@_name'] === 'Колір' || p['@_name'] === 'Color');
    return colorParam ? colorParam['#text'] : 'N/A';
}

// --- СУПЕР РОЗУМНИЙ ХЕЛПЕР ДЛЯ TOTOBI ---
// Тепер він приймає ще й `params`, щоб шукати там
function getSmartStock(obj: any, params?: any): { stock: number, available: number } {
    let stock = 0;
    let available = 0;
    let reserve = 0;

    // 1. Отримуємо "amount" (Фізичний залишок)
    if (obj['@_amount'] !== undefined) {
        stock = parseInt(obj['@_amount']);
    } else if (obj.amount !== undefined) {
        stock = parseInt(obj.amount);
    }

    // 2. Отримуємо "reserve" (Резерв)
    if (obj['@_reserve'] !== undefined) {
        reserve = parseInt(obj['@_reserve']);
    } else if (obj.reserve !== undefined) {
        reserve = parseInt(obj.reserve);
    }

    // 3. Рахуємо Доступне = Фізичний - Резерв
    if (stock > 0) {
        available = Math.max(0, stock - reserve);
    }

    // --- ДОДАТКОВА ПЕРЕВІРКА В ПАРАМЕТРАХ ---
    // Якщо у нас вийшов 0 або 300 (підозріла цифра), 
    // спробуємо знайти параметр "Залишок" або "Кількість"
    if (params) {
        const paramsArr = Array.isArray(params) ? params : [params];
        const stockParam = paramsArr.find((p: any) =>
            p['@_name'] === 'Залишок' || p['@_name'] === 'Кількість' || p['@_name'] === 'Наявність'
        );
        if (stockParam && stockParam['#text']) {
            const paramStock = parseInt(stockParam['#text']);
            // Якщо в параметрах цифра більша, ніж ми знайшли раніше - віримо їй!
            if (paramStock > available) {
                stock = paramStock;
                available = paramStock;
            }
        }
    }

    // 4. ЯКЩО МАТЕМАТИКА СПРАЦЮВАЛА (і вийшло > 0), ВІРИМО ЇЙ ПЕРШ ЗА ВСЕ!
    if (available > 0) {
        return { stock, available };
    }

    // 5. Тільки якщо все інше дало 0, дивимось на "quantity_in_stock"
    if (obj.quantity_in_stock !== undefined) {
        const q = parseInt(obj.quantity_in_stock);
        if (q > 0) {
            return { stock: q, available: q };
        }
    }

    // Якщо все по нулях, пробуємо stock_quantity
    if (stock === 0 && available === 0 && obj.stock_quantity !== undefined) {
        stock = parseInt(obj.stock_quantity);
        available = stock;
    }

    return { stock, available };
}