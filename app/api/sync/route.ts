import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

// Налаштування для Vercel
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

// --- ІНІЦІАЛІЗАЦІЯ SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Використовуємо Service Role Key, якщо він є, інакше Anon Key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Карта категорій для TopTime (ID -> Назва)
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
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const rate = parseFloat(searchParams.get('rate') || '43.5');

    log(`🚀 Start Sync: ${provider} | URL provided: ${!!importUrl}`);

    if (!importUrl) {
         return NextResponse.json({ success: false, error: "URL is empty", debug_log: debugLog }, { status: 400 });
    }

    if (provider === 'toptime') {
        return await syncTopTime(importUrl, rate, log, debugLog);
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
    log(`Fetching Totobi XML...`);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    
    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonData = parser.parse(xmlText);
    
    // 1. ПАРСИНГ КАТЕГОРІЙ (щоб отримати назви по ID)
    const categoriesMap: Record<string, string> = {};
    const rawCats = jsonData.yml_catalog?.shop?.categories?.category;
    if (rawCats) {
        const catsArr = Array.isArray(rawCats) ? rawCats : [rawCats];
        catsArr.forEach((c: any) => {
            if (c['@_id']) categoriesMap[c['@_id'].toString()] = c['#text'];
        });
        log(`Loaded ${Object.keys(categoriesMap).length} category names from XML.`);
    }

    // 2. ПАРСИНГ ТОВАРІВ
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

        // Обробка розмірів
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

        // Визначаємо назву категорії
        const catId = offer.categoryId?.toString();
        const catName = categoriesMap[catId] || null;

        // Додаткові параметри
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
            // ПИШЕМО ПРЯМО В ТЕКСТОВІ КОЛОНКИ
            category: catName, 
            category_external_id: catId,
            updated_at: new Date().toISOString()
        };
    }).filter((p: any) => p.external_id && p.title);

    // Запис у базу
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
// 2. ЛОГІКА TOPTIME
// ==========================================
async function syncTopTime(url: string, eurRate: number, log: Function, debugLog: string[]) {
    log(`Downloading TopTime XML (Rate: ${eurRate})...`);
    
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

    // Пошук items
    let items = null;
    if (jsonData.items?.item) items = jsonData.items.item;
    else if (jsonData.yml_catalog?.shop?.items?.item) items = jsonData.yml_catalog.shop.items.item;
    else {
        // Fallback
        for (const key of Object.keys(jsonData)) {
            if (jsonData[key]?.item) { items = jsonData[key].item; break; }
        }
    }

    if (!items) throw new Error("Could not find <item> list in XML.");
    
    const itemsArray = Array.isArray(items) ? items : [items];
    log(`Found ${itemsArray.length} items. Grouping...`);
    
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
            const rawCatId = (item.id_category || item.categoryId || item.category_id)?.toString();
            // Беремо назву з карти
            const catName = TOPTIME_CATEGORY_MAP[rawCatId] || null;

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
                // ПИШЕМО ПРЯМО В ТЕКСТОВІ КОЛОНКИ
                category: catName,
                category_external_id: rawCatId,
                updated_at: new Date().toISOString()
            };
        }

        groupedProducts[parentSku].sizes.push(sizeObj);
        groupedProducts[parentSku].amount += stockAvailable;
    }

    const finalProducts = Object.values(groupedProducts);
    
    // Запис у БД порціями по 50
    const BATCH_SIZE = 50; 
    let successCount = 0;
    let errorCount = 0;

    log(`Upserting ${finalProducts.length} products...`);

    for (let i = 0; i < finalProducts.length; i += BATCH_SIZE) {
        const batch = finalProducts.slice(i, i + BATCH_SIZE);
        const { error } = await supabaseAdmin.from('products').upsert(batch, { onConflict: 'external_id' });
        
        if (error) {
            log(`Batch error: ${error.message}`);
            errorCount += batch.length;
        } else {
            successCount += batch.length;
        }
    }

    return NextResponse.json({ 
        done: true, 
        total: finalProducts.length, 
        success: successCount,
        errors: errorCount,
        debug_log: debugLog
    });
}