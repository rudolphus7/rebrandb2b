import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

// Налаштування для Vercel (Timeouts)
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

// --- ІНІЦІАЛІЗАЦІЯ SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// --- SMART MAPPING КАТЕГОРІЙ ---
// Приводимо TopTime ID до назв твого MEGA MENU (Totobi)
const TOPTIME_CATEGORY_MAP: Record<string, string> = {
    // Одяг
    '10': 'Футболки', 
    '11': 'Футболки', 
    '12': 'Футболки',
    '13': 'Футболки', // Майки туди ж, або створи окрему якщо в меню є
    '2':  'Поло',
    '14': 'Реглани, фліси',
    '15': 'Реглани, фліси', // Худі
    '16': 'Реглани, фліси',
    '4':  'Реглани, фліси', // Фліси
    '19': 'Куртки та софтшели', // Жилети/Куртки
    '23': 'Куртки та софтшели',
    
    // Головні убори
    '6': 'Кепки',
    '7': 'Шапки', // Якщо в меню є "Шапки", інакше "Головні убори"
    
    // Сумки та рюкзаки
    '20': 'Сумки для покупок', // Шопери
    '21': 'Рюкзаки',
    '22': 'Сумки дорожні та спортивні',
    
    // Парасолі
    '1': 'Парасолі',

    // Інше (Mapping під структуру Totobi)
    '17': 'Ручки', // Офіс -> Ручки
    '9':  'Запальнички',
    '8':  'Шнурки'
};

export async function GET(request: Request) {
  const debugLog: string[] = [];
  const log = (msg: string) => { 
      console.log(msg); 
      debugLog.push(`${new Date().toISOString().split('T')[1]} - ${msg}`); 
  };

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'totobi';
    const importUrl = searchParams.get('url') || "";
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50'); 
    const rate = parseFloat(searchParams.get('rate') || '43.5');

    log(`🚀 Start Sync: ${provider} | Offset: ${offset} | Limit: ${limit}`);

    if (!importUrl) {
         return NextResponse.json({ success: false, error: "URL is empty", debug_log: debugLog }, { status: 400 });
    }

    if (provider === 'toptime') {
        return await syncTopTime(importUrl, rate, offset, limit, log, debugLog);
    } else {
        return await syncTotobi(importUrl, offset, limit, log, debugLog);
    }

  } catch (error: any) {
    console.error("Sync Critical Error:", error);
    return NextResponse.json({ success: false, error: error.message, debug_log: debugLog }, { status: 500 });
  }
}

// ==========================================
// 1. ЛОГІКА TOTOBI (Без змін, працює добре)
// ==========================================
async function syncTotobi(url: string, offset: number, limit: number, log: Function, debugLog: string[]) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    
    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonData = parser.parse(xmlText);
    
    // 1. Категорії
    const categoriesMap: Record<string, string> = {};
    const rawCats = jsonData.yml_catalog?.shop?.categories?.category;
    if (rawCats) {
        const catsArr = Array.isArray(rawCats) ? rawCats : [rawCats];
        catsArr.forEach((c: any) => {
            if (c['@_id']) categoriesMap[c['@_id'].toString()] = c['#text'];
        });
    }

    // 2. Товари
    const allOffers = jsonData.yml_catalog?.shop?.offers?.offer || jsonData.offers?.offer;
    if (!allOffers) throw new Error("No offers found in XML.");
    
    const offersArray = Array.isArray(allOffers) ? allOffers : [allOffers];
    const totalOffers = offersArray.length;

    if (offset >= totalOffers) {
        return NextResponse.json({ done: true, total: totalOffers, processed: totalOffers, debug_log: debugLog });
    }

    const chunk = offersArray.slice(offset, offset + limit);

    const productsToUpsert = chunk.map((offer: any) => {
        let basePrice = parseFloat(offer.price);
        let sizesData = [];

        // Обробка розмірів Totobi
        if (offer.textile === 'Y' && offer.sizes?.size) {
            const sizesArr = Array.isArray(offer.sizes.size) ? offer.sizes.size : [offer.sizes.size];
            if ((!basePrice || isNaN(basePrice)) && sizesArr.length > 0) {
                basePrice = parseFloat(sizesArr[0]['@_modifier']);
            }
            sizesData = sizesArr.map((s: any) => ({
                label: s['#text'], 
                price: parseFloat(s['@_modifier']),
                stock_total: parseInt(s['@_amount'] || 0),
                stock_reserve: parseInt(s['@_reserve'] || 0),
                stock_available: parseInt(s['@_in_stock'] || 0),
                // Totobi зазвичай має колір в параметрах, а не в sizes, 
                // але для уніфікації можна додавати сюди, якщо потрібно
                color: extractColor(offer.param) 
            }));
        }

        if (!basePrice || isNaN(basePrice)) basePrice = 0;
        
        let imageUrl = null;
        if (offer.picture) imageUrl = Array.isArray(offer.picture) ? offer.picture[0] : offer.picture;

        const catId = offer.categoryId?.toString();
        const catName = categoriesMap[catId] || "Інше";
        const amount = parseInt(offer.amount) || 0;
        const colorVal = extractColor(offer.param);
        const brandVal = extractBrand(offer.param, offer.vendor);

        return {
            external_id: offer['@_id']?.toString(),
            title: offer.name,
            price: basePrice,
            image_url: imageUrl,
            sku: offer.vendorCode,
            description: offer.description ? offer.description.substring(0, 5000) : "",
            amount: amount,
            reserve: parseInt(offer.reserve) || 0,
            sizes: sizesData,
            color: colorVal,
            brand: brandVal,
            category: catName, 
            category_external_id: catId,
            updated_at: new Date().toISOString(),
            in_stock: amount > 0
        };
    }).filter((p: any) => p.external_id && p.title);

    if (productsToUpsert.length > 0) {
        const { error } = await supabaseAdmin.from('products').upsert(productsToUpsert, { onConflict: 'external_id' });
        if (error) {
            log(`Supabase Error: ${error.message}`);
            throw error;
        }
    }

    return NextResponse.json({ 
        done: false, 
        total: totalOffers, 
        processed: offset + productsToUpsert.length, 
        nextOffset: offset + limit,
        debug_log: debugLog
    });
}

// Допоміжні функції для Totobi
function extractColor(params: any) {
    if (!params) return null;
    const pArr = Array.isArray(params) ? params : [params];
    const p = pArr.find((x: any) => x['@_name'] === 'Колір' || x['@_name'] === 'Група Кольорів');
    return p ? p['#text'] : null;
}
function extractBrand(params: any, vendor: string) {
    if (vendor) return vendor;
    if (!params) return null;
    const pArr = Array.isArray(params) ? params : [params];
    const p = pArr.find((x: any) => x['@_name'] === 'ТМ' || x['@_name'] === 'Бренд');
    return p ? p['#text'] : null;
}

// ==========================================
// 2. ЛОГІКА TOPTIME (REFACTORED)
// ==========================================
async function syncTopTime(url: string, eurRate: number, offset: number, limit: number, log: Function, debugLog: string[]) {
    // 1. Завантаження XML
    let xmlText = "";
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        xmlText = await response.text();
    } catch (e: any) {
        throw new Error(`Failed to fetch XML: ${e.message}`);
    }

    const parser = new XMLParser();
    const jsonData = parser.parse(xmlText);

    // Шукаємо масив items
    let items = null;
    if (jsonData.items?.item) items = jsonData.items.item;
    else if (jsonData.yml_catalog?.shop?.items?.item) items = jsonData.yml_catalog.shop.items.item;
    else {
        // Fallback пошук
        for (const key of Object.keys(jsonData)) {
            if (jsonData[key]?.item) { items = jsonData[key].item; break; }
        }
    }

    if (!items) throw new Error("Could not find <item> list in XML.");
    const itemsArray = Array.isArray(items) ? items : [items];
    
    // 2. ГРУПУВАННЯ ЗА БАЗОВИМ АРТИКУЛОМ
    // Ми хочемо, щоб різні кольори однієї моделі стали одним товаром
    const groupedProducts: Record<string, any> = {};

    for (const item of itemsArray) {
        // TopTime: article = "5102.10" (Модель.Колір)
        // Ми хочемо згрупувати по "5102"
        const fullSku = item.article ? item.article.toString() : "";
        if (!fullSku) continue;

        // ВИТЯГУЄМО БАЗОВИЙ SKU (до крапки або дефісу)
        // Якщо артикул "5102", base = "5102". Якщо "5102.30", base = "5102".
        const baseSku = fullSku.split(/[.-]/)[0];

        // Визначаємо розмір
        let sizeLabel = "ONE SIZE";
        if (item.name && typeof item.name === 'string' && item.name.includes(',')) {
            const parts = item.name.split(',');
            sizeLabel = parts[parts.length - 1].trim();
        } else if (item.code) {
             const parts = item.code.toString().split('_');
             if (parts.length > 2) sizeLabel = parts[parts.length - 1];
        }

        const priceEur = parseFloat(item.price) || 0;
        const priceUah = Math.ceil(priceEur * eurRate);
        const stockAvailable = parseInt(item.count2 || item.count || '0');
        
        // Формуємо варіант для sizes
        const sizeObj = {
            label: sizeLabel,
            price: priceUah,
            stock_total: parseInt(item.count3 || item.count || '0'), 
            stock_reserve: 0, 
            stock_available: stockAvailable,
            // ВАЖЛИВО: Додаємо колір у варіант, щоб фронтенд знав, що це за розмір
            color: item.color || "Assorted",
            sku_variant: fullSku // Зберігаємо унікальний код варіанту
        };

        if (!groupedProducts[baseSku]) {
            const rawCatId = (item.id_category || item.categoryId || item.category_id)?.toString();
            // Мапінг на назви Totobi
            const catName = TOPTIME_CATEGORY_MAP[rawCatId] || "Інше";

            // Чистимо назву від кольору і розміру (беремо першу частину до коми)
            const cleanTitle = item.name ? item.name.split(',')[0].trim() : "Product";

            groupedProducts[baseSku] = {
                // Використовуємо Base SKU як ID товару в базі!
                external_id: baseSku, 
                title: cleanTitle,
                price: priceUah,
                image_url: item.photo,
                sku: baseSku,
                description: item.content || item.content_ua || "",
                amount: 0, 
                reserve: 0,
                sizes: [], // Сюди пушимо всі кольори і розміри
                color: "Multi", // На рівні товару пишемо Multi, бо кольори всередині
                brand: item.brand,
                category: catName,
                category_external_id: rawCatId,
                updated_at: new Date().toISOString(),
                in_stock: false 
            };
        }

        // Додаємо варіант до батьківського товару
        groupedProducts[baseSku].sizes.push(sizeObj);
        groupedProducts[baseSku].amount += stockAvailable;
        if (stockAvailable > 0) {
            groupedProducts[baseSku].in_stock = true;
        }
    }

    const finalProducts = Object.values(groupedProducts);
    const totalProducts = finalProducts.length;

    // Пагінація (Simulated for Supabase batching)
    if (offset >= totalProducts) {
        return NextResponse.json({ 
            done: true, 
            total: totalProducts, 
            processed: totalProducts, 
            debug_log: debugLog 
        });
    }

    const endIndex = Math.min(offset + limit, totalProducts);
    const batch = finalProducts.slice(offset, endIndex);
    
    log(`Upserting TopTime batch: ${offset} - ${endIndex} of ${totalProducts} grouped models.`);

    // Upsert в базу
    const { error } = await supabaseAdmin.from('products').upsert(batch, { onConflict: 'external_id' });
    
    if (error) {
        log(`Batch error: ${error.message}`);
        throw error;
    }

    return NextResponse.json({ 
        done: false, 
        total: totalProducts, 
        processed: endIndex,
        nextOffset: endIndex,
        debug_log: debugLog
    });
}