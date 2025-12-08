import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

export const maxDuration = 300; 
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

// --- HELPER: Безпечне перетворення в рядок ---
// Якщо прийде null, undefined або об'єкт - поверне "" і не впаде
function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    return String(val);
}

function detectCategory(titleInput: string, rawCategoryInput: string) {
    const text = `${safeStr(titleInput)} ${safeStr(rawCategoryInput)}`.toLowerCase();
    
    for (const main of MENU_STRUCTURE) {
        for (const sub of main.subs) {
            if (sub === 'Футболки' && text.includes('поло')) continue;
            if (sub === 'Кепки' && text.includes('дитяч')) continue;
            // Перевіряємо корінь слова (рюкзак -> рюкзаки)
            if (text.includes(sub.toLowerCase().slice(0, -1))) return sub;
        }
    }
    // Fallback правила
    if (text.includes('футболк')) return 'Футболки';
    if (text.includes('поло')) return 'Поло';
    if (text.includes('куртк')) return 'Куртки та софтшели';
    if (text.includes('парасол')) return 'Парасолі складні';
    if (text.includes('рюкзак')) return 'Рюкзаки';
    
    return "Інше";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'totobi';
  const url = searchParams.get('url');
  const eurRate = parseFloat(searchParams.get('rate') || '43.5');

  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const xmlText = await response.text();

    // 🔥 FIX 1: Вимикаємо parseTagValue, щоб "007" залишалось "007", а не 7
    const parser = new XMLParser({ 
        ignoreAttributes: false, 
        attributeNamePrefix: "@_",
        parseTagValue: false 
    });
    const jsonData = parser.parse(xmlText);

    let items: any[] = [];
    
    // Отримання масиву товарів (захищене)
    if (provider === 'toptime') {
        let rawItems = jsonData.items?.item || jsonData.yml_catalog?.shop?.items?.item;
        if (!rawItems) {
             const keys = Object.keys(jsonData);
             if (jsonData[keys[0]]?.item) rawItems = jsonData[keys[0]].item;
        }
        if (rawItems) {
            items = Array.isArray(rawItems) ? rawItems : [rawItems];
        }
    } else {
        let rawOffers = jsonData.yml_catalog?.shop?.offers?.offer;
        if (rawOffers) {
            items = Array.isArray(rawOffers) ? rawOffers : [rawOffers];
        }
    }

    if (items.length === 0) {
        return NextResponse.json({ success: false, message: "No items found in XML" });
    }

    // --- ГРУПУВАННЯ ---
    const groupedModels: Record<string, any> = {};

    for (const item of items) {
        // 🔥 FIX 2: Якщо айтем битий - пропускаємо
        if (!item) continue;

        let sku = "", title = "", price = 0, image = "", description = "", rawCategory = "", brand = "", color = "";
        let sizes: any[] = [];

        try {
            if (provider === 'toptime') {
                sku = safeStr(item.article || item.code);
                title = safeStr(item.name);
                price = Math.ceil((parseFloat(item.price) || 0) * eurRate);
                image = safeStr(item.photo);
                description = safeStr(item.content || item.content_ua);
                rawCategory = safeStr(item.group);
                brand = safeStr(item.brand);
                color = safeStr(item.color);
                
                const stock = parseInt(item.count2 || item.count || '0');
                if (stock > 0) {
                    sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
                }
            } else {
                // Totobi
                sku = safeStr(item.vendorCode);
                title = safeStr(item.name);
                price = parseFloat(item.price) || 0;
                
                const rawPic = item.picture;
                image = Array.isArray(rawPic) ? safeStr(rawPic[0]) : safeStr(rawPic);
                
                description = safeStr(item.description);
                rawCategory = safeStr(item.categoryId);
                brand = safeStr(item.vendor);
                
                const params = Array.isArray(item.param) ? item.param : (item.param ? [item.param] : []);
                const colorParam = params.find((p: any) => {
                    const name = safeStr(p?.['@_name']);
                    return name === 'Колір' || name === 'Color' || name === 'Група Кольорів';
                });
                if (colorParam) color = safeStr(colorParam['#text']);

                if (item.sizes?.size) {
                    const sArr = Array.isArray(item.sizes.size) ? item.sizes.size : [item.sizes.size];
                    sArr.forEach((s: any) => {
                        sizes.push({
                            label: safeStr(s['#text'] || "ONE SIZE"),
                            stock_available: parseInt(s['@_in_stock'] || s['@_amount'] || 0),
                            price: parseFloat(s['@_modifier'] || price)
                        });
                    });
                } else {
                    const stock = parseInt(item.amount || item.in_stock || 0);
                    sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
                }
            }

            // Якщо немає SKU - це сміття, пропускаємо
            if (!sku || sku === "undefined") continue;

            // Створення базового SKU (ключ групи)
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

            // Якщо колір не знайдено, пробуємо витягти останнє слово з назви
            if (!color) {
                const parts = title.split(' ');
                if (parts.length > 1) color = parts[parts.length - 1];
            }

            // Перевірка на дублікати варіантів
            const isDuplicate = groupedModels[baseSku].variants.some((v: any) => v.sku_variant === sku);
            
            if (!isDuplicate) {
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

        } catch (innerError) {
            // Якщо один товар "битий", ми його пропускаємо, а не валимо весь імпорт
            console.error(`Skipping bad item: ${innerError}`);
            continue;
        }
    }

    const finalProducts = Object.values(groupedModels);

    // Запис в базу пакетами
    const batchSize = 50;
    for (let i = 0; i < finalProducts.length; i += batchSize) {
        const batch = finalProducts.slice(i, i + batchSize);
        const { error } = await supabaseAdmin.from('products').upsert(batch, { onConflict: 'external_id' });
        if (error) throw error;
    }

    return NextResponse.json({ 
        success: true, 
        message: `Processed ${items.length} items into ${finalProducts.length} models`,
    });

  } catch (error: any) {
    console.error("Sync Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}