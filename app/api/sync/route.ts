import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

// Налаштування для Vercel
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

// --- СТАНДАРТИ КАТЕГОРІЙ (МАЄ СПІВПАДАТИ З HEADER) ---
const CATEGORY_RULES = [
    { name: "Футболки", keywords: ["футболк", "t-shirt", "майка"], exclude: ["поло", "polo"] },
    { name: "Поло", keywords: ["поло", "polo"] },
    { name: "Реглани, фліси", keywords: ["реглан", "фліс", "fleece", "худі", "hoodie", "світшот", "sweatshirt", "толстовка"] },
    { name: "Куртки та софтшели", keywords: ["куртка", "jacket", "softshell", "софтшел", "парка", "жилет", "vest"] },
    { name: "Кепки", keywords: ["кепка", "cap", "бейсболк"] },
    { name: "Шапки", keywords: ["шапк", "beanie"] },
    { name: "Рюкзаки", keywords: ["рюкзак", "backpack"] },
    { name: "Сумки для покупок", keywords: ["шопер", "shopper", "покупок", "totebag"] },
    { name: "Сумки дорожні та спортивні", keywords: ["дорожня", "спортивна", "duffel", "travel bag"] },
    { name: "Сумки для ноутбуків", keywords: ["ноутбук", "laptop", "портфель"] },
    { name: "Парасолі", keywords: ["парасоля", "umbrella"] },
    { name: "Ручки", keywords: ["ручк", "pen"] },
    { name: "Запальнички", keywords: ["запальничк", "lighter"] },
    { name: "Шнурки", keywords: ["шнур", "lanyard"] },
    { name: "Термоси та термокружки", keywords: ["термос", "thermos", "термокружк", "tumbler"] },
    { name: "Горнятка", keywords: ["горнятк", "mug", "чашка"] },
    { name: "Пляшки для пиття", keywords: ["пляшка", "bottle"] },
    { name: "Зарядні пристрої", keywords: ["повербанк", "powerbank", "зарядн"] },
    { name: "Щоденники", keywords: ["щоденник", "diary", "блокнот", "notebook"] }
];

// ID-Mapping для TopTime (якщо є чіткі ID)
const TOPTIME_CATEGORY_MAP: Record<string, string> = {
    '10': 'Футболки', '11': 'Футболки', '12': 'Футболки', '13': 'Футболки',
    '2':  'Поло',
    '14': 'Реглани, фліси', '15': 'Реглани, фліси', '16': 'Реглани, фліси', '4': 'Реглани, фліси',
    '19': 'Куртки та софтшели', '23': 'Куртки та софтшели',
    '6': 'Кепки', '7': 'Шапки',
    '20': 'Сумки для покупок', '21': 'Рюкзаки', '22': 'Сумки дорожні та спортивні',
    '1': 'Парасолі',
    '17': 'Ручки', '9': 'Запальнички', '8': 'Шнурки'
};

// --- ФУНКЦІЯ ВИЗНАЧЕННЯ КАТЕГОРІЇ (AI-LITE) ---
function detectCategory(title: string, rawCategory: string): string {
    const text = `${title} ${rawCategory}`.toLowerCase();
    
    for (const rule of CATEGORY_RULES) {
        // 1. Перевірка виключень
        if (rule.exclude && rule.exclude.some(ex => text.includes(ex))) continue;
        // 2. Перевірка ключових слів
        if (rule.keywords.some(kw => text.includes(kw))) return rule.name;
    }
    
    // Якщо не знайшли - повертаємо сиру категорію або "Інше"
    // Можна спробувати почистити сиру категорію (прибрати "чоловічі" і т.д.)
    if (rawCategory) return rawCategory.replace(/чоловічі|жіночі|дитячі|унісекс/gi, '').trim();

    return "Інше";
}

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
// 1. ЛОГІКА TOTOBI
// ==========================================
async function syncTotobi(url: string, offset: number, limit: number, log: Function, debugLog: string[]) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    
    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonData = parser.parse(xmlText);
    
    // Карта сирих категорій з XML
    const categoriesMap: Record<string, string> = {};
    const rawCats = jsonData.yml_catalog?.shop?.categories?.category;
    if (rawCats) {
        const catsArr = Array.isArray(rawCats) ? rawCats : [rawCats];
        catsArr.forEach((c: any) => {
            if (c['@_id']) categoriesMap[c['@_id'].toString()] = c['#text'];
        });
    }

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
                color: extractColor(offer.param) 
            }));
        }

        if (!basePrice || isNaN(basePrice)) basePrice = 0;
        
        let imageUrl = null;
        if (offer.picture) imageUrl = Array.isArray(offer.picture) ? offer.picture[0] : offer.picture;

        const catId = offer.categoryId?.toString();
        const rawCatName = categoriesMap[catId] || "";
        
        // 🔥 ВИКОРИСТОВУЄМО РОЗУМНЕ ВИЗНАЧЕННЯ КАТЕГОРІЇ
        const normalizedCategory = detectCategory(offer.name, rawCatName);

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
            category: normalizedCategory, // Записуємо чисту категорію
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

// Допоміжні функції
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
// 2. ЛОГІКА TOPTIME
// ==========================================
async function syncTopTime(url: string, eurRate: number, offset: number, limit: number, log: Function, debugLog: string[]) {
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

    let items = null;
    if (jsonData.items?.item) items = jsonData.items.item;
    else if (jsonData.yml_catalog?.shop?.items?.item) items = jsonData.yml_catalog.shop.items.item;
    else {
        for (const key of Object.keys(jsonData)) {
            if (jsonData[key]?.item) { items = jsonData[key].item; break; }
        }
    }

    if (!items) throw new Error("Could not find <item> list in XML.");
    const itemsArray = Array.isArray(items) ? items : [items];
    
    // Групуємо товари
    const groupedProducts: Record<string, any> = {};

    for (const item of itemsArray) {
        const fullSku = item.article ? item.article.toString() : "";
        if (!fullSku) continue;

        // Групування по SKU (до крапки)
        const baseSku = fullSku.split(/[.-]/)[0];

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
        
        const sizeObj = {
            label: sizeLabel,
            price: priceUah,
            stock_total: parseInt(item.count3 || item.count || '0'), 
            stock_reserve: 0, 
            stock_available: stockAvailable,
            color: item.color || "Assorted",
            sku_variant: fullSku 
        };

        if (!groupedProducts[baseSku]) {
            const rawCatId = (item.id_category || item.categoryId || item.category_id)?.toString();
            
            // 1. Спробуємо мапінг по ID
            let catName = TOPTIME_CATEGORY_MAP[rawCatId];
            
            // 2. Якщо ID немає, пробуємо визначити по назві (Fallback)
            if (!catName) {
                const rawTitle = item.name || "";
                catName = detectCategory(rawTitle, "");
            }

            const cleanTitle = item.name ? item.name.split(',')[0].trim() : "Product";

            groupedProducts[baseSku] = {
                external_id: baseSku, 
                title: cleanTitle,
                price: priceUah,
                image_url: item.photo,
                sku: baseSku,
                description: item.content || item.content_ua || "",
                amount: 0, 
                reserve: 0,
                sizes: [], 
                color: "Multi", 
                brand: item.brand,
                category: catName || "Інше",
                category_external_id: rawCatId,
                updated_at: new Date().toISOString(),
                in_stock: false 
            };
        }

        groupedProducts[baseSku].sizes.push(sizeObj);
        groupedProducts[baseSku].amount += stockAvailable;
        if (stockAvailable > 0) {
            groupedProducts[baseSku].in_stock = true;
        }
    }

    const finalProducts = Object.values(groupedProducts);
    const totalProducts = finalProducts.length;

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