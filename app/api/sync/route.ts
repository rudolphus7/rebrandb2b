import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { supabase } from '@/lib/supabaseClient';

// --- НАЛАШТУВАННЯ КАТЕГОРІЙ TOPTIME ---
// ID з XML -> Назва категорії у ТВОЇЙ базі даних
const TOPTIME_CATEGORY_MAP: Record<string, string> = {
    '10': 'Футболки', 
    '11': 'Футболки', // V-подібний
    '12': 'Футболки', // Довгий рукав
    '13': 'Майки',
    '2': 'Поло',
    '14': 'Реглани', // Або "Світшоти"
    '15': 'Худі',    // Кенгуру
    '16': 'Худі',    // Кенгуру на замок
    '4': 'Фліси',
    '19': 'Куртки',  // Або "Жилети"
    '6': 'Кепки',
    '7': 'Шапки',
    '9': 'Запальнички',
    '17': 'Ручки',
    '8': 'Шнурки'
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'totobi';
    const importUrl = searchParams.get('url') || "";
    
    // Для Totobi (посторінково)
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Для TopTime (курс валют)
    const rate = parseFloat(searchParams.get('rate') || '43.5');

    console.log(`🚀 [Sync] Provider: ${provider} | Offset: ${offset}`);

    if (provider === 'toptime') {
        return await syncTopTime(importUrl, rate);
    } else {
        return await syncTotobi(importUrl, offset, limit);
    }

  } catch (error: any) {
    console.error("Sync API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ==========================================
// 1. ЛОГІКА TOTOBI (YML)
// ==========================================
async function syncTotobi(url: string, offset: number, limit: number) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`YML fetch failed: ${response.statusText}`);
    
    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonData = parser.parse(xmlText);
    
    const allOffers = jsonData.yml_catalog?.shop?.offers?.offer;
    if (!allOffers) throw new Error("No offers found in XML");
    
    const offersArray = Array.isArray(allOffers) ? allOffers : [allOffers];
    const totalOffers = offersArray.length;

    if (offset >= totalOffers) {
        return NextResponse.json({ done: true, total: totalOffers, processed: 0 });
    }

    const chunk = offersArray.slice(offset, offset + limit);

    const productsToUpsert = chunk.map((offer: any) => {
        let basePrice = parseFloat(offer.price);
        let sizesData = [];

        // Парсинг розмірів Totobi (вони вкладені в param)
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

        // Отримання бренду і кольору з параметрів
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
        const { error } = await supabase.from('products').upsert(productsToUpsert, { onConflict: 'external_id' });
        if (error) throw error;
    }

    return NextResponse.json({ 
        done: false, 
        total: totalOffers, 
        processed: offset + productsToUpsert.length, 
        nextOffset: offset + limit 
    });
}

// ==========================================
// 2. ЛОГІКА TOPTIME (XML)
// ==========================================
async function syncTopTime(url: string, eurRate: number) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`TopTime XML fetch failed: ${response.statusText}`);
    
    const xmlText = await response.text();
    const parser = new XMLParser();
    const jsonData = parser.parse(xmlText);

    // В TopTime кожен розмір - це окремий item
    const items = jsonData.yml_catalog?.shop?.items?.item || jsonData.items?.item;
    if (!items) throw new Error("XML Structure unknown (cannot find items)");

    const itemsArray = Array.isArray(items) ? items : [items];
    
    // 1. ГРУПУВАННЯ: Нам треба зібрати всі розміри в один товар
    // Ключ групування - 'article' (наприклад ST2000_YEL)
    const groupedProducts: Record<string, any> = {};

    for (const item of itemsArray) {
        const parentSku = item.article; // ST2000_YEL
        if (!parentSku) continue;

        // Витягуємо розмір з назви (наприклад "Classic Men, 2XS" -> "2XS")
        let sizeLabel = "ONE SIZE";
        if (item.name && item.name.includes(',')) {
            const parts = item.name.split(',');
            sizeLabel = parts[parts.length - 1].trim();
        }

        // Ціна в грн
        const priceEur = parseFloat(item.price);
        const priceUah = Math.ceil(priceEur * eurRate);

        // Наявність (count2 - доступно для покупки)
        const stockAvailable = parseInt(item.count2) || 0;
        
        // Формуємо об'єкт розміру
        const sizeObj = {
            label: sizeLabel,
            price: priceUah,
            stock_total: parseInt(item.count3) || 0, // На складі
            stock_reserve: 0, // TopTime не віддає резерв окремо
            stock_available: stockAvailable
        };

        if (!groupedProducts[parentSku]) {
            // Створюємо батьківський товар
            // Шукаємо категорію в базі
            const categoryName = TOPTIME_CATEGORY_MAP[item.id_category] || null;
            let categoryId = null;

            if (categoryName) {
                // Спробуємо знайти категорію в БД (це спрощено, в ідеалі треба кешувати)
                // Оскільки це серверний код, ми можемо зробити це пізніше або зараз
                // Тут ми просто запишемо назву, а при upsert спробуємо зв'язати, якщо є ID
            }

            groupedProducts[parentSku] = {
                external_id: parentSku, // Використовуємо артикул як ID товару
                title: item.name.split(',')[0].trim(), // "Classic Men"
                price: priceUah,
                image_url: item.photo,
                sku: parentSku,
                description: item.content || item.content_ua || "",
                amount: 0, // Перерахуємо суму
                reserve: 0,
                sizes: [],
                color: item.color,
                brand: item.brand,
                // Зберігаємо тимчасово ім'я категорії, щоб потім знайти ID
                _category_name_hint: categoryName 
            };
        }

        // Додаємо розмір
        groupedProducts[parentSku].sizes.push(sizeObj);
        groupedProducts[parentSku].amount += stockAvailable;
    }

    // 2. ПІДГОТОВКА ДО ЗАПИСУ В БД
    const productsList = Object.values(groupedProducts);

    // 3. РОЗУМНИЙ ПОШУК КАТЕГОРІЙ (Опціонально)
    // Отримуємо всі категорії з БД, щоб знайти UUID
    const { data: dbCategories } = await supabase.from('categories').select('id, title');
    
    const finalProducts = productsList.map(p => {
        let catId = null;
        if (p._category_name_hint && dbCategories) {
            // Шукаємо схожу категорію
            const found = dbCategories.find((c: any) => 
                c.title.toLowerCase().includes(p._category_name_hint.toLowerCase())
            );
            if (found) catId = found.id;
        }
        
        // Видаляємо тимчасове поле
        delete p._category_name_hint;
        
        return {
            ...p,
            category_id: catId // Якщо знайшли - прив'язуємо
        };
    });

    // 4. BATCH UPSERT (Записуємо пачками по 100, щоб не перевантажити базу)
    const BATCH_SIZE = 100;
    for (let i = 0; i < finalProducts.length; i += BATCH_SIZE) {
        const batch = finalProducts.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('products').upsert(batch, { onConflict: 'external_id' });
        if (error) console.error("Batch error:", error.message);
    }

    return NextResponse.json({ 
        done: true, // TopTime робимо за один прохід
        total: finalProducts.length, 
        processed: finalProducts.length 
    });
}