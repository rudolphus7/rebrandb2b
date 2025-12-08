import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

export const maxDuration = 300; // 5 хвилин на виконання
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// --- ВАША СТРУКТУРА МЕНЮ (Джерело істини) ---
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

// Функція яка знаходить правильну категорію
function detectCategory(title: string, rawCategory: string) {
    const text = `${title} ${rawCategory}`.toLowerCase();
    
    for (const main of MENU_STRUCTURE) {
        for (const sub of main.subs) {
            // Перевіряємо точне входження підкатегорії
            // Можна додати синоніми, але поки перевіримо пряме входження
            const keywords = sub.toLowerCase().split(/[\s,]+/); // "Сумки для ноутбуків" -> ["сумки", "для", "ноутбуків"]
            
            // Проста логіка: якщо ключове слово підкатегорії є в тексті
            // Для "Футболки" треба виключити "Поло"
            if (sub === 'Футболки' && text.includes('поло')) continue;
            if (sub === 'Кепки' && text.includes('дитяч')) continue; // Щоб дитячі не лізли в дорослі

            // Шукаємо по ключових словах (спрощено)
            if (text.includes(sub.toLowerCase().slice(0, -1))) { // slice - щоб знайти "рюкзак" в "рюкзаки"
                return sub;
            }
        }
    }
    // Fallback: якщо не знайшли, пробуємо мапити стандартні слова
    if (text.includes('футболк')) return 'Футболки';
    if (text.includes('поло')) return 'Поло';
    if (text.includes('куртк')) return 'Куртки та софтшели';
    if (text.includes('рюкзак')) return 'Рюкзаки';
    if (text.includes('парасол')) return 'Парасолі складні';
    if (text.includes('чашк') || text.includes('кружк') || text.includes('mug')) return 'Горнятка';
    
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
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonData = parser.parse(xmlText);

    let items: any[] = [];
    
    // Нормалізація вхідних даних (Totobi vs TopTime)
    if (provider === 'toptime') {
        // TopTime XML structure
        let rawItems = jsonData.items?.item || jsonData.yml_catalog?.shop?.items?.item;
        if (!Array.isArray(rawItems)) rawItems = [rawItems];
        items = rawItems;
    } else {
        // Totobi YML structure
        let rawOffers = jsonData.yml_catalog?.shop?.offers?.offer;
        if (!Array.isArray(rawOffers)) rawOffers = [rawOffers];
        items = rawOffers;
    }

    // --- ГОЛОВНА МАГІЯ: ГРУПУВАННЯ ---
    const groupedModels: Record<string, any> = {};

    for (const item of items) {
        let sku = "";
        let title = "";
        let price = 0;
        let image = "";
        let description = "";
        let sizes: any[] = [];
        let rawCategory = "";
        let brand = "";
        let color = "";

        if (provider === 'toptime') {
            sku = item.article?.toString() || item.code?.toString();
            title = item.name;
            price = Math.ceil((parseFloat(item.price) || 0) * eurRate);
            image = item.photo;
            description = item.content || item.content_ua;
            rawCategory = item.group || ""; // TopTime categories usually in group
            brand = item.brand;
            color = item.color;
            // TopTime sizes/stock logic
            const stock = parseInt(item.count2 || item.count || '0');
            if (stock > 0) {
                // TopTime sizes logic is complex, usually in name or code. Assuming One Size if not specified
                sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
            }
        } else {
            // Totobi
            sku = item.vendorCode;
            title = item.name;
            price = parseFloat(item.price) || 0;
            image = Array.isArray(item.picture) ? item.picture[0] : item.picture;
            description = item.description;
            rawCategory = item.categoryId; // Need to map ID to Name if possible, or use title
            brand = item.vendor;
            
            // Extract Color from params
            const params = Array.isArray(item.param) ? item.param : (item.param ? [item.param] : []);
            const colorParam = params.find((p: any) => p['@_name'] === 'Колір' || p['@_name'] === 'Color');
            if (colorParam) color = colorParam['#text'];

            // Sizes
            if (item.sizes?.size) {
                const sArr = Array.isArray(item.sizes.size) ? item.sizes.size : [item.sizes.size];
                sArr.forEach((s: any) => {
                    sizes.push({
                        label: s['#text'],
                        stock_available: parseInt(s['@_in_stock'] || s['@_amount'] || 0),
                        price: parseFloat(s['@_modifier'] || price) // Sometimes price is in modifier
                    });
                });
            } else {
                const stock = parseInt(item.amount || item.in_stock || 0);
                sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
            }
        }

        if (!sku) continue;

        // 1. СТВОРЮЄМО BASE SKU (Ключ групи)
        // Логіка: ST2100 SUN -> ST2100.  5102.30 -> 5102.
        const baseSku = sku.split(/[ ._\-]/)[0]; // Беремо першу частину до пробілу, крапки або дефісу

        // 2. Визначаємо правильну категорію
        const cleanCategory = detectCategory(title, rawCategory);

        // 3. Ініціалізуємо групу, якщо немає
        if (!groupedModels[baseSku]) {
            groupedModels[baseSku] = {
                external_id: baseSku, // ID товару буде базовим артикулом!
                title: title.replace(color, '').trim(), // Видаляємо колір з назви головного товару
                description: description,
                category: cleanCategory,
                price: price, // Базова ціна
                image_url: image,
                sku: baseSku, // Зберігаємо базовий SKU
                brand: brand,
                variants: [], // Сюди будемо пхати варіанти
                updated_at: new Date().toISOString(),
                in_stock: false
            };
        }

        // 4. Додаємо цей конкретний айтем як ВАРІАНТ в групу
        // Якщо колір не вказано, пробуємо витягти з назви
        if (!color) {
             const parts = title.split(' ');
             color = parts[parts.length - 1]; // Часто колір останній
        }

        groupedModels[baseSku].variants.push({
            sku_variant: sku,
            color: color || "Standard",
            image: image,
            sizes: sizes, // Масив розмірів з їх залишками
            price: price
        });

        // 5. Оновлюємо загальний статус наявності
        const hasStock = sizes.some(s => s.stock_available > 0);
        if (hasStock) {
            groupedModels[baseSku].in_stock = true;
        }
    }

    const finalProducts = Object.values(groupedModels);

    // Записуємо в Supabase пакетами
    const batchSize = 100;
    for (let i = 0; i < finalProducts.length; i += batchSize) {
        const batch = finalProducts.slice(i, i + batchSize);
        const { error } = await supabaseAdmin.from('products').upsert(batch, { onConflict: 'external_id' });
        if (error) console.error('Supabase Error:', error);
    }

    return NextResponse.json({ 
        success: true, 
        message: `Processed ${items.length} items into ${finalProducts.length} models`,
        sample: finalProducts[0] 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}