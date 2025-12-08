import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

export const maxDuration = 50; 
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

// --- HELPER: АБСОЛЮТНО БЕЗПЕЧНИЙ РЯДОК ---
function safeStr(val: any): string {
    try {
        if (val === null || val === undefined) return "";
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'number') return String(val);
        if (typeof val === 'object') {
            // Якщо це масив, беремо перший елемент
            if (Array.isArray(val)) return safeStr(val[0]);
            // Якщо об'єкт з текстом (XML особливість)
            if (val['#text']) return String(val['#text']).trim();
            return "";
        }
        return String(val).trim();
    } catch (e) {
        return "";
    }
}

function generateSlugId(text: string): string {
    const safeText = safeStr(text);
    if (!safeText) return "RBR-UNKNOWN-" + Math.random().toString(36).substr(2, 5);
    
    return safeText
        .toLowerCase()
        .replace(/[^a-z0-9а-яіїєґ]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
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
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'totobi';
    const url = searchParams.get('url');
    const eurRate = 43.5;

    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    log(`Start fetching ${provider}...`);
    const response = await fetch(url, { cache: 'no-store' });
    const xmlText = await response.text();
    
    // Парсинг без типізації чисел (все як текст)
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const jsonData = parser.parse(xmlText);

    let items: any[] = [];
    
    // Максимально широкий пошук масиву товарів
    if (provider === 'toptime') {
        let raw = jsonData?.items?.item || jsonData?.yml_catalog?.shop?.items?.item;
        if (!raw && jsonData) {
             const keys = Object.keys(jsonData);
             if (keys.length > 0 && jsonData[keys[0]]?.item) raw = jsonData[keys[0]].item;
        }
        items = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    } else {
        let raw = jsonData?.yml_catalog?.shop?.offers?.offer;
        items = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    }

    log(`Found ${items.length} items.`);

    // --- ОБРОБКА ---
    const models: Record<string, any> = {};
    let errorCount = 0;

    for (const item of items) {
        // 🔥 TRY-CATCH НА КОЖЕН ЕЛЕМЕНТ - ЦЕ ГАРАНТУЄ, ЩО СКРИПТ НЕ ВПАДЕ
        try {
            if (!item) continue;

            // Витягуємо дані використовуючи safeStr
            let title = "", sku = "", image = "", desc = "", catRaw = "", brand = "", color = "";
            let price = 0;
            let sizes: any[] = [];

            if (provider === 'toptime') {
                title = safeStr(item.name);
                sku = safeStr(item.article || item.code);
                const pVal = parseFloat(safeStr(item.price).replace(',', '.'));
                price = Math.ceil((isNaN(pVal) ? 0 : pVal) * eurRate);
                image = safeStr(item.photo);
                desc = safeStr(item.content || item.content_ua);
                catRaw = safeStr(item.group);
                brand = safeStr(item.brand);
                color = safeStr(item.color);
                
                const stock = parseInt(safeStr(item.count2 || item.count || '0').replace(/\D/g, '')) || 0;
                if (stock > 0) sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
            } else {
                // Totobi
                title = safeStr(item.name);
                sku = safeStr(item.vendorCode);
                const pVal = parseFloat(safeStr(item.price).replace(',', '.'));
                price = isNaN(pVal) ? 0 : pVal;
                
                const rawP = item.picture;
                image = Array.isArray(rawP) ? safeStr(rawP[0]) : safeStr(rawP);
                if (image && !image.startsWith('http')) image = ""; // Валідація картинки

                desc = safeStr(item.description);
                catRaw = safeStr(item.categoryId);
                brand = safeStr(item.vendor);
                
                // Безпечний пошук параметрів
                const params = Array.isArray(item?.param) ? item.param : (item?.param ? [item.param] : []);
                const cParam = params.find((p: any) => safeStr(p?.['@_name']).toLowerCase().includes('колір') || safeStr(p?.['@_name']).toLowerCase().includes('color'));
                if (cParam) color = safeStr(cParam['#text']);

                // Розміри
                const rawSizes = item?.sizes?.size;
                if (rawSizes) {
                    const sArr = Array.isArray(rawSizes) ? rawSizes : [rawSizes];
                    sArr.forEach((s: any) => {
                        const stockVal = parseInt(safeStr(s['@_in_stock'] || s['@_amount']).replace(/\D/g, '')) || 0;
                        const modP = parseFloat(safeStr(s['@_modifier']).replace(',', '.'));
                        sizes.push({
                            label: safeStr(s['#text'] || "STD"),
                            stock_available: stockVal,
                            price: isNaN(modP) ? price : modP
                        });
                    });
                } else {
                    const stock = parseInt(safeStr(item.amount || item.in_stock).replace(/\D/g, '')) || 0;
                    sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
                }
            }

            // Валідація: якщо немає назви, пропускаємо
            if (!title) continue;

            // --- ВЛАСНИЙ ID (RBR-...) ---
            
            // Якщо колір не прийшов окремим полем, шукаємо в кінці назви
            if (!color) {
                const parts = title.split(' ');
                if (parts.length > 2) color = parts[parts.length - 1];
            }

            // Чистимо назву від кольору
            let modelName = title;
            if (color && color.length > 1) {
                // Екрануємо спецсимволи для regex
                const safeColor = color.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                modelName = title.replace(new RegExp(safeColor, 'gi'), '').trim();
                modelName = modelName.replace(/[-_.,]+$/, '').trim(); // Прибрати хвости
            }
            if (modelName.length < 3) modelName = title;

            const myId = `RBR-${generateSlugId(modelName)}`;

            // Створення моделі
            if (!models[myId]) {
                models[myId] = {
                    external_id: myId,
                    title: modelName,
                    description: desc.substring(0, 5000),
                    category: detectCategory(title, catRaw),
                    price: price,
                    image_url: image,
                    sku: myId,
                    base_sku: myId,
                    brand: brand,
                    variants: [],
                    updated_at: new Date().toISOString(),
                    in_stock: false,
                    amount: 0
                };
            }

            // Додавання варіанту
            const isDup = models[myId].variants.some((v: any) => v.sku_variant === sku);
            if (!isDup) {
                models[myId].variants.push({
                    sku_variant: sku || "UNKNOWN",
                    color: color || "Standard",
                    image: image,
                    sizes: sizes,
                    price: price
                });
            }

            const totalS = sizes.reduce((a, b) => a + b.stock_available, 0);
            models[myId].amount += totalS;
            if (totalS > 0) models[myId].in_stock = true;

        } catch (e) {
            // ЛОГУЄМО, АЛЕ НЕ ПАДАЄМО
            console.error("Item skipped due to error:", e);
            errorCount++;
        }
    }

    const finalData = Object.values(models);
    log(`Grouped into ${finalData.length} models. Errors skipped: ${errorCount}`);

    // Запис в базу (Батчі)
    const batchSize = 50; 
    for (let i = 0; i < finalData.length; i += batchSize) {
        const batch = finalData.slice(i, i + batchSize);
        const { error } = await supabaseAdmin.from('products').upsert(batch, { onConflict: 'external_id' });
        if (error) {
            console.error(`Batch error at index ${i}:`, error.message);
            // Продовжуємо навіть якщо батч впав
        }
    }

    return NextResponse.json({ success: true, logs: logs });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, logs: logs }, { status: 500 });
  }
}