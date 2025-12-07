import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

// Налаштування для Vercel
export const maxDuration = 60; // Максимальний час виконання
export const dynamic = 'force-dynamic';

// --- ІНІЦІАЛІЗАЦІЯ SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Перевіряємо, чи є сервісний ключ. Якщо немає - пробуємо анон ключ (це може викликати помилки RLS)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const isServiceKey = serviceKey === process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TOPTIME_CATEGORY_MAP: Record<string, string> = {
    '10': 'Футболки', 
    '11': 'Футболки',
    '12': 'Футболки',
    '13': 'Майки',
    '2': 'Поло',
    '14': 'Реглани',
    '15': 'Худі',
    '16': 'Худі',
    '4': 'Фліси',
    '19': 'Куртки',
    '6': 'Кепки',
    '7': 'Шапки',
    '9': 'Запальнички',
    '17': 'Ручки',
    '8': 'Шнурки'
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
    
    // Параметри
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const rate = parseFloat(searchParams.get('rate') || '43.5');

    log(`🚀 Start Sync: ${provider} | Auth Mode: ${isServiceKey ? 'SERVICE_ROLE (Admin)' : 'ANON (Public/Restricted)'}`);
    if (!isServiceKey) log(`⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. RLS policies might block category creation!`);

    if (!importUrl) {
         return NextResponse.json({ success: false, error: "URL is empty", debug_log: debugLog }, { status: 400 });
    }

    if (provider === 'toptime') {
        return await syncTopTime(importUrl, rate, log, debugLog);
    } else {
        return await syncTotobi(importUrl, offset, limit, log, debugLog);
    }

  } catch (error: any) {
    console.error("Sync API Critical Error:", error);
    return NextResponse.json({ success: false, error: error.message, debug_log: debugLog }, { status: 500 });
  }
}

// ==========================================
// 1. ЛОГІКА TOTOBI
// ==========================================
async function syncTotobi(url: string, offset: number, limit: number, log: Function, debugLog: string[]) {
    log(`Fetching Totobi XML...`);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    
    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonData = parser.parse(xmlText);
    
    const allOffers = jsonData.yml_catalog?.shop?.offers?.offer || jsonData.offers?.offer;
    if (!allOffers) throw new Error("No offers found in XML.");
    
    const offersArray = Array.isArray(allOffers) ? allOffers : [allOffers];
    const totalOffers = offersArray.length;

    log(`Total offers: ${totalOffers}, Offset: ${offset}`);

    if (offset >= totalOffers) {
        return NextResponse.json({ done: true, total: totalOffers, processed: 0, debug_log: debugLog });
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
                stock_available: parseInt(s['@_in_stock'] || 0)
            }));
        }

        if (!basePrice || isNaN(basePrice)) basePrice = 0;
        
        let imageUrl = null;
        if (offer.picture) imageUrl = Array.isArray(offer.picture) ? offer.picture[0] : offer.picture;

        let colorValue = null;
        let brandValue = offer.vendor;
        if (offer.param) {
            const params = Array.isArray(offer.param) ? offer.param : [offer.param];
            const colorParam = params.find((p: any) => p['@_name'] === 'Колір' || p['@_name'] === 'Група Кольорів');
            if (colorParam) colorValue = colorParam['#text'];
            const brandParam = params.find((p: any) => p['@_name'] === 'ТМ' || p['@_name'] === 'Бренд');
            if (brandParam) brandValue = brandParam['#text'];
        }

        return {
            external_id: offer['@_id']?.toString(),
            title: offer.name,
            price: basePrice,
            image_url: imageUrl,
            sku: offer.vendorCode,
            description: offer.description ? offer.description.substring(0, 5000) : "",
            amount: parseInt(offer.amount) || 0,
            reserve: parseInt(offer.reserve) || 0,
            sizes: sizesData,
            color: colorValue,
            brand: brandValue,
            category_external_id: offer.categoryId?.toString(),
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

// ==========================================
// 2. ЛОГІКА TOPTIME (XML) - ПОКРАЩЕНА
// ==========================================
async function syncTopTime(url: string, eurRate: number, log: Function, debugLog: string[]) {
    log(`Downloading TopTime XML (Rate: ${eurRate})...`);
    
    let xmlText = "";
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        xmlText = await response.text();
        log(`Downloaded ${xmlText.length} bytes.`);
    } catch (e: any) {
        log(`Fetch Error: ${e.message}`);
        throw new Error(`Failed to fetch XML: ${e.message}`);
    }

    log(`Parsing XML...`);
    const parser = new XMLParser();
    const jsonData = parser.parse(xmlText);

    let items = null;
    if (jsonData.items?.item) items = jsonData.items.item;
    else if (jsonData.yml_catalog?.shop?.items?.item) items = jsonData.yml_catalog.shop.items.item;
    else if (jsonData.root?.item) items = jsonData.root.item;
    else if (jsonData.catalog?.item) items = jsonData.catalog.item;
    else if (jsonData.export?.item) items = jsonData.export.item;
    else {
        for (const key of Object.keys(jsonData)) {
            if (jsonData[key]?.item) {
                items = jsonData[key].item;
                break;
            }
        }
    }

    if (!items) {
        log(`XML structure invalid. Keys: ${Object.keys(jsonData).join(', ')}`);
        throw new Error("Could not find <item> list in XML.");
    }

    const itemsArray = Array.isArray(items) ? items : [items];
    log(`Found ${itemsArray.length} items. Processing...`);
    
    const groupedProducts: Record<string, any> = {};

    for (const item of itemsArray) {
        const parentSku = item.article; 
        if (!parentSku) continue;

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
        const stockTotal = parseInt(item.count3 || item.count || '0');
        
        const sizeObj = {
            label: sizeLabel,
            price: priceUah,
            stock_total: stockTotal, 
            stock_reserve: 0, 
            stock_available: stockAvailable
        };

        if (!groupedProducts[parentSku]) {
            const rawCatId = item.id_category || item.categoryId || item.category_id;
            
            groupedProducts[parentSku] = {
                external_id: parentSku.toString(),
                title: item.name ? item.name.split(',')[0].trim() : "No Title",
                price: priceUah,
                image_url: item.photo,
                sku: parentSku.toString(),
                description: item.content || item.content_ua || "",
                amount: 0, 
                reserve: 0,
                sizes: [],
                color: item.color,
                brand: item.brand,
                _category_id_raw: rawCatId
            };
        }

        groupedProducts[parentSku].sizes.push(sizeObj);
        groupedProducts[parentSku].amount += stockAvailable;
    }

    const productsList = Object.values(groupedProducts);
    log(`Grouped into ${productsList.length} unique products. checking DB categories...`);

    // ===========================================
    // 🔥 АВТО-СТВОРЕННЯ КАТЕГОРІЙ (FIXED)
    // ===========================================
    
    // 1. Отримуємо існуючі категорії (Initial fetch)
    let { data: dbCategories, error: catError } = await supabaseAdmin.from('categories').select('id, title');
    if (catError) {
        log(`Category fetch error: ${catError.message}`);
        dbCategories = [];
    }
    if (!dbCategories) dbCategories = [];
    log(`Initial DB Categories count: ${dbCategories.length}`);

    // 2. Збираємо список назв категорій
    const neededCategoryNames = new Set<string>();
    productsList.forEach(p => {
        if (p._category_id_raw) {
            const mapName = TOPTIME_CATEGORY_MAP[p._category_id_raw.toString()];
            if (mapName) neededCategoryNames.add(mapName);
        }
    });

    // 3. Знаходимо відсутні
    const missingCategories: string[] = [];
    neededCategoryNames.forEach(name => {
        const exists = dbCategories?.find((c: any) => c.title.toLowerCase().trim() === name.toLowerCase().trim());
        if (!exists) missingCategories.push(name);
    });

    // 4. Створюємо відсутні
    let refetchNeeded = false;
    if (missingCategories.length > 0) {
        log(`Attempting to create ${missingCategories.length} categories: ${missingCategories.join(', ')}`);
        
        const newCatsPayload = missingCategories.map(title => ({
            title: title,
            slug: 'cat-' + Date.now() + '-' + Math.floor(Math.random() * 100000), 
            image_url: '' 
        }));

        const { error: createError } = await supabaseAdmin.from('categories').insert(newCatsPayload);
        
        if (createError) {
            log(`Create categories warning: ${createError.message}. (Could be duplicate error, ignoring...)`);
        }
        refetchNeeded = true;
    }

    // 5. ОБОВ'ЯЗКОВИЙ RE-FETCH (якщо були спроби створення або список порожній)
    if (refetchNeeded || dbCategories.length === 0) {
         log(`Refetching categories...`);
         const { data: refreshed, error: refreshError } = await supabaseAdmin.from('categories').select('id, title');
         if (refreshError) {
             log(`Refetch Error: ${refreshError.message}`);
         } else if (refreshed) {
             dbCategories = refreshed;
             log(`Categories refreshed. New count: ${dbCategories.length}`);
         }
    }

    // ===========================================
    // 🔥 МАПІНГ ТА ЗАПИС
    // ===========================================

    let matchedCategoriesCount = 0;

    const finalProducts = productsList.map(p => {
        let catId = null;
        
        if (p._category_id_raw) {
             const mapName = TOPTIME_CATEGORY_MAP[p._category_id_raw.toString()];
             if (mapName && dbCategories) {
                const found = dbCategories.find((c: any) => c.title.toLowerCase().trim() === mapName.toLowerCase().trim());
                if (found) catId = found.id;
             }
        }
        
        if (!catId && p._category_name_hint && dbCategories) {
            const found = dbCategories.find((c: any) => c.title.toLowerCase().includes(p._category_name_hint.toLowerCase()));
            if (found) catId = found.id;
        }

        if (catId) matchedCategoriesCount++;
        else if (matchedCategoriesCount < 3) {
            // Лише кілька логів для налагодження
            log(`Failed match for ${p.sku} (RawID: ${p._category_id_raw}). DB count: ${dbCategories?.length}`);
        }

        delete p._category_id_raw;
        delete p._category_name_hint;
        
        return { ...p, category_id: catId };
    });

    log(`Categories matched for ${matchedCategoriesCount} / ${finalProducts.length} products.`);

    const BATCH_SIZE = 20; 
    let successCount = 0;
    let errorCount = 0;

    log(`Starting upsert of ${finalProducts.length} products...`);

    for (let i = 0; i < finalProducts.length; i += BATCH_SIZE) {
        const batch = finalProducts.slice(i, i + BATCH_SIZE);
        const { error } = await supabaseAdmin.from('products').upsert(batch, { onConflict: 'external_id' });
        
        if (error) {
            log(`Batch ${i} error: ${error.message}`);
            errorCount += batch.length;
        } else {
            successCount += batch.length;
        }
    }

    log(`Done. Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({ 
        done: true, 
        total: finalProducts.length, 
        success: successCount,
        errors: errorCount,
        debug_log: debugLog
    });
}