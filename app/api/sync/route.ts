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

// --- СТРУКТУРА МЕНЮ (Твоя) ---
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

function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
        if (Array.isArray(val)) return safeStr(val[0]);
        if (val['#text']) return String(val['#text']).trim();
        return "";
    }
    return String(val).trim();
}

function generateSlugId(text: string): string {
    const safeText = safeStr(text);
    if (!safeText) return "RBR-" + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    return "RBR-" + safeText
        .toLowerCase()
        .replace(/[^a-z0-9а-яіїєґ]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 40)
        .toUpperCase();
}

function detectCategory(title: string, rawCat: string) {
    const text = `${safeStr(title)} ${safeStr(rawCat)}`.toLowerCase();
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
    // Безпечне читання параметрів
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const eurRate = parseFloat(searchParams.get('rate') || '43.5');

    if (!url) return NextResponse.json({ success: false, error: "URL is empty" }, { status: 400 });

    const response = await fetch(url, { cache: 'no-store' });
    const xmlText = await response.text();

    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const jsonData = parser.parse(xmlText);

    let items: any[] = [];
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

    if (!items || items.length === 0) {
        return NextResponse.json({ success: false, error: "XML is empty or bad format" });
    }

    // Пагінація на стороні отримання масиву (щоб не обробляти все відразу)
    // АЛЕ: Для групування нам бажано бачити все. 
    // Компроміс: Ми обробляємо весь XML в пам'яті (Node.js це витримає для 5-10к товарів), 
    // але пишемо в базу батчами. Клієнтська пагінація тут для відображення прогресу.
    
    // --- ГРУПУВАННЯ ---
    const models: Record<string, any> = {};

    for (const item of items) {
        if (!item) continue;

        let title = safeStr(item.name || item.title);
        let sku = safeStr(item.vendorCode || item.article || item.code);
        let color = "";
        
        // Шукаємо колір
        if (item.color) color = safeStr(item.color);
        if (!color && item.param) {
            const params = Array.isArray(item.param) ? item.param : [item.param];
            const c = params.find((p: any) => safeStr(p?.['@_name']).toLowerCase().includes('колір'));
            if (c) color = safeStr(c['#text']);
        }
        // Fallback кольору з назви
        if (!color) {
            const parts = title.split(' ');
            if (parts.length > 2) color = parts[parts.length - 1];
        }

        // --- ВЛАСНИЙ ID (Групуємо по назві без кольору) ---
        let modelName = title;
        if (color) {
            // Вирізаємо колір з назви
            try {
                modelName = title.replace(new RegExp(color.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), '').trim();
                modelName = modelName.replace(/[-_.,]+$/, '').trim();
            } catch (e) {
                modelName = title;
            }
        }
        if (modelName.length < 3) modelName = title; // Якщо випадково стерли все

        const myId = generateSlugId(modelName); // Наш унікальний ID (RBR-futbolka-...)

        // Створюємо модель
        if (!models[myId]) {
            let price = parseFloat(safeStr(item.price).replace(',', '.')) || 0;
            if (provider === 'toptime') price = Math.ceil(price * eurRate);

            let image = "";
            if (item.picture) image = Array.isArray(item.picture) ? safeStr(item.picture[0]) : safeStr(item.picture);
            else if (item.photo) image = safeStr(item.photo);

            models[myId] = {
                external_id: myId,
                title: modelName,
                description: safeStr(item.description || item.content || item.content_ua).substring(0, 5000),
                category: detectCategory(title, safeStr(item.categoryId || item.group)),
                price: price,
                image_url: image,
                sku: myId, // Наш внутрішній артикул
                base_sku: myId,
                brand: safeStr(item.brand || item.vendor),
                variants: [],
                updated_at: new Date().toISOString(),
                in_stock: false,
                amount: 0
            };
        }

        // Обробка розмірів
        let sizes: any[] = [];
        let stock = 0;
        let itemPrice = models[myId].price;

        if (item.sizes?.size) {
            const sArr = Array.isArray(item.sizes.size) ? item.sizes.size : [item.sizes.size];
            sArr.forEach((s: any) => {
                const qty = parseInt(safeStr(s['@_in_stock'] || s['@_amount']).replace(/\D/g, '')) || 0;
                const modP = parseFloat(safeStr(s['@_modifier']));
                sizes.push({
                    label: safeStr(s['#text'] || "STD"),
                    stock_available: qty,
                    price: isNaN(modP) ? itemPrice : modP
                });
                stock += qty;
            });
        } else {
            stock = parseInt(safeStr(item.amount || item.count || item.count2 || item.in_stock).replace(/\D/g, '')) || 0;
            sizes.push({ label: "ONE SIZE", stock_available: stock, price: itemPrice });
        }

        // Додаємо варіант
        const isDup = models[myId].variants.some((v: any) => v.sku_variant === sku);
        if (!isDup) {
            models[myId].variants.push({
                sku_variant: sku, // Артикул постачальника
                color: color || "Standard",
                image: models[myId].image_url, // Поки беремо головну
                sizes: sizes,
                price: itemPrice
            });
            models[myId].amount += stock;
            if (stock > 0) models[myId].in_stock = true;
        }
    }

    const finalProducts = Object.values(models);
    
    // Пагінація для клієнта (щоб не вантажити базу за раз)
    // Ми беремо шматочок з уже згрупованого масиву
    const pagedData = finalProducts.slice(offset, offset + limit);
    
    if (pagedData.length > 0) {
        const { error } = await supabaseAdmin.from('products').upsert(pagedData, { onConflict: 'external_id' });
        if (error) throw error;
    }

    // Повертаємо done: true тільки коли offset перевищить кількість моделей
    const isDone = (offset + limit) >= finalProducts.length;

    return NextResponse.json({ 
        success: true, 
        done: isDone,
        processed: pagedData.length,
        total: finalProducts.length,
        nextOffset: offset + limit
    });

  } catch (error: any) {
    console.error("Critical Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}