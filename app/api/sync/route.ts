import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

export const maxDuration = 300; // 5 хвилин
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// --- СТРУКТУРА МЕНЮ ---
const MENU_STRUCTURE = [
  { name: 'Сумки', subs: ['Валізи', 'Косметички', 'Мішок спортивний', 'Рюкзаки', 'Сумки для ноутбуків', 'Сумки для покупок', 'Сумки дорожні та спортивні', 'Сумки на пояс', 'Термосумки'] },
  { name: 'Ручки', subs: ['Еко ручки', 'Металеві ручки', 'Олівці', 'Пластикові ручки'] },
  { name: 'Подорож та відпочинок', subs: ['Все для пікніка', 'Ліхтарики', 'Ланч бокси', 'Лопати', 'Пледи', 'Пляшки для пиття', 'Подушки', 'Термоси та термокружки', 'Фляги', 'Фрізбі', 'Штопори'] },
  { name: 'Парасолі', subs: ['Парасолі складні', 'Парасолі-тростини'] },
  { name: 'Одяг', subs: ['Вітровки', 'Рукавички', 'Спортивний одяг', 'Футболки', 'Поло', 'Дитячий одяг', 'Реглани, фліси', 'Жилети', 'Куртки та софтшели'] },
  { name: 'Головні убори', subs: ['Дитяча кепка', 'Панами', 'Шапки', 'Кепки'] },
  { name: 'Інструменти', subs: ['Викрутки', 'Мультитули', 'Набір інструментів', 'Ножі', 'Рулетки'] },
  { name: 'Офіс', subs: ['Записні книжки', 'Календарі'] },
  { name: 'Персональні аксессуари', subs: ['Брелки', 'Візитниці', 'Дзеркала'] },
  { name: 'Для професіоналів', subs: ['Опадоміри'] },
  { name: 'Електроніка', subs: ['Аксесуари', 'Годинники', 'Зарядні пристрої', 'Зволожувачі повітря', 'Лампи', 'Портативна акустика'] },
  { name: 'Дім', subs: ['Дошки кухонні', 'Кухонне приладдя', 'Млини для спецій', 'Набори для сиру', 'Рушники', 'Свічки', 'Сковорідки', 'Стакани', 'Чайники', 'Годівнички'] },
  { name: 'Посуд', subs: ['Горнятка'] },
  { name: 'Упаковка', subs: ['Подарункова коробка', 'Подарунковий пакет'] },
];

// 🔥 БРОНЕБІЙНА ФУНКЦІЯ: Перетворює що завгодно в рядок
function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    // Якщо прийшов об'єкт (наприклад, пустий тег), повертаємо пустий рядок або текст всередині
    if (typeof val === 'object') {
        if (val['#text']) return String(val['#text']);
        return ""; 
    }
    return String(val);
}

function detectCategory(titleInput: any, rawCategoryInput: any) {
    const text = `${safeStr(titleInput)} ${safeStr(rawCategoryInput)}`.toLowerCase();
    
    for (const main of MENU_STRUCTURE) {
        for (const sub of main.subs) {
            if (sub === 'Футболки' && text.includes('поло')) continue;
            if (sub === 'Кепки' && text.includes('дитяч')) continue;
            if (text.includes(sub.toLowerCase().slice(0, -1))) return sub;
        }
    }
    if (text.includes('футболк')) return 'Футболки';
    if (text.includes('поло')) return 'Поло';
    if (text.includes('куртк')) return 'Куртки та софтшели';
    if (text.includes('рюкзак')) return 'Рюкзаки';
    return "Інше";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'totobi';
    const url = searchParams.get('url');
    const eurRate = parseFloat(searchParams.get('rate') || '43.5');

    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const response = await fetch(url, { cache: 'no-store' });
    const xmlText = await response.text();

    // Налаштування парсера: ігноруємо конвертацію, щоб артикул "007" не став числом 7
    const parser = new XMLParser({ 
        ignoreAttributes: false, 
        attributeNamePrefix: "@_",
        parseTagValue: false 
    });
    const jsonData = parser.parse(xmlText);

    let items: any[] = [];
    
    // Отримання списку товарів (безпечне)
    if (provider === 'toptime') {
        let rawItems = jsonData.items?.item || jsonData.yml_catalog?.shop?.items?.item;
        // Fallback пошук
        if (!rawItems) {
             const keys = Object.keys(jsonData);
             if (jsonData[keys[0]]?.item) rawItems = jsonData[keys[0]].item;
        }
        if (rawItems) items = Array.isArray(rawItems) ? rawItems : [rawItems];
    } else {
        let rawOffers = jsonData.yml_catalog?.shop?.offers?.offer;
        if (rawOffers) items = Array.isArray(rawOffers) ? rawOffers : [rawOffers];
    }

    if (!items || items.length === 0) {
        return NextResponse.json({ success: false, message: "No items found" });
    }

    // --- ГРУПУВАННЯ ---
    const groupedModels: Record<string, any> = {};
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
        // 🔥 TRY-CATCH НА КОЖЕН ТОВАР: Якщо один битий, інші пройдуть
        try {
            if (!item) continue;

            let sku = "", title = "", price = 0, image = "", description = "", rawCategory = "", brand = "", color = "";
            let sizes: any[] = [];

            if (provider === 'toptime') {
                sku = safeStr(item.article || item.code);
                title = safeStr(item.name);
                price = Math.ceil((parseFloat(safeStr(item.price)) || 0) * eurRate);
                image = safeStr(item.photo);
                description = safeStr(item.content || item.content_ua);
                rawCategory = safeStr(item.group);
                brand = safeStr(item.brand);
                color = safeStr(item.color);
                
                const stock = parseInt(safeStr(item.count2 || item.count || '0'));
                if (stock > 0) {
                    sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
                }
            } else {
                // Totobi
                sku = safeStr(item.vendorCode);
                title = safeStr(item.name);
                price = parseFloat(safeStr(item.price)) || 0;
                
                const rawPic = item.picture;
                image = Array.isArray(rawPic) ? safeStr(rawPic[0]) : safeStr(rawPic);
                
                description = safeStr(item.description);
                rawCategory = safeStr(item.categoryId);
                brand = safeStr(item.vendor);
                
                const params = Array.isArray(item.param) ? item.param : (item.param ? [item.param] : []);
                const colorParam = params.find((p: any) => {
                    const n = safeStr(p?.['@_name']);
                    return n === 'Колір' || n === 'Color' || n === 'Група Кольорів';
                });
                if (colorParam) color = safeStr(colorParam['#text']);

                if (item.sizes?.size) {
                    const sArr = Array.isArray(item.sizes.size) ? item.sizes.size : [item.sizes.size];
                    sArr.forEach((s: any) => {
                        sizes.push({
                            label: safeStr(s['#text'] || "ONE SIZE"),
                            stock_available: parseInt(safeStr(s['@_in_stock'] || s['@_amount'] || 0)),
                            price: parseFloat(safeStr(s['@_modifier'] || price))
                        });
                    });
                } else {
                    const stock = parseInt(safeStr(item.amount || item.in_stock || 0));
                    sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
                }
            }

            // Якщо немає SKU - це сміття
            if (!sku || sku === "undefined" || sku.length < 2) continue;

            const baseSku = sku.split(/[ ._\-]/)[0]; 
            const cleanCategory = detectCategory(title, rawCategory);

            if (!groupedModels[baseSku]) {
                groupedModels[baseSku] = {
                    external_id: baseSku,
                    title: title.replace(color, '').trim(),
                    description: description.substring(0, 5000),
                    category: cleanCategory,
                    price: price,
                    image_url: image,
                    sku: baseSku,
                    brand: brand,
                    variants: [],
                    updated_at: new Date().toISOString(),
                    in_stock: false,
                    amount: 0
                };
            }

            if (!color) {
                const parts = title.split(' ');
                if (parts.length > 1) color = parts[parts.length - 1];
            }

            // Уникаємо дублів в масиві варіантів
            const exists = groupedModels[baseSku].variants.some((v: any) => v.sku_variant === sku);
            if (!exists) {
                groupedModels[baseSku].variants.push({
                    sku_variant: sku,
                    color: color || "Standard",
                    image: image,
                    sizes: sizes,
                    price: price
                });
            }

            const totalStock = sizes.reduce((acc, s) => acc + s.stock_available, 0);
            groupedModels[baseSku].amount += totalStock;
            if (totalStock > 0) groupedModels[baseSku].in_stock = true;
            
            successCount++;

        } catch (innerErr) {
            console.error("Skipping bad item:", innerErr);
            errorCount++;
        }
    }

    const finalProducts = Object.values(groupedModels);

    // Записуємо в Supabase пакетами (Батчі)
    const batchSize = 50;
    for (let i = 0; i < finalProducts.length; i += batchSize) {
        const batch = finalProducts.slice(i, i + batchSize);
        const { error } = await supabaseAdmin.from('products').upsert(batch, { onConflict: 'external_id' });
        if (error) {
            console.error('Supabase Batch Error:', error);
            // Не викидаємо помилку, а логуємо, щоб спробувати наступний батч
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Processed. Models: ${finalProducts.length}. Errors skipped: ${errorCount}`,
    });

  } catch (error: any) {
    console.error("Sync Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}