import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

// Налаштування
export const maxDuration = 300; 
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// --- HELPER: Очищення рядків (замість crypto) ---
// Робить з "Футболка Valueweight Червона" -> "futbolka-valueweight"
function generateSlugId(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9а-яіїєґ]+/g, '-') // Замінюємо спецсимволи на дефіс
        .replace(/^-+|-+$/g, '') // Прибираємо дефіси по краях
        .substring(0, 50); // Обрізаємо, щоб не було гігантських ID
}

// --- HELPER: Безпечний текст ---
function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === 'object') return val['#text'] ? String(val['#text']) : "";
    return String(val).trim();
}

// --- ВИЗНАЧЕННЯ КАТЕГОРІЙ (Спрощено) ---
function detectCategory(title: string, rawCat: string) {
    const t = (title + " " + rawCat).toLowerCase();
    
    if (t.includes('сумк') || t.includes('рюкзак') || t.includes('шопер')) return 'Сумки';
    if (t.includes('ручк') || t.includes('олівц')) return 'Ручки';
    if (t.includes('парасол')) return 'Парасолі';
    if (t.includes('футболк')) return 'Футболки';
    if (t.includes('поло')) return 'Поло';
    if (t.includes('кепк') || t.includes('шапк')) return 'Головні убори';
    if (t.includes('куртк') || t.includes('жилет') || t.includes('фліс')) return 'Одяг';
    if (t.includes('чашк') || t.includes('термос')) return 'Посуд';
    
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

    if (!url) throw new Error("URL is missing");

    log(`1. Start fetching ${provider}...`);
    
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const xmlText = await response.text();
    
    log(`2. XML received. Length: ${xmlText.length}`);

    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const jsonData = parser.parse(xmlText);

    // --- ОТРИМАННЯ МАСИВУ ТОВАРІВ ---
    let items: any[] = [];
    
    // Шукаємо масив items де завгодно
    if (jsonData?.yml_catalog?.shop?.offers?.offer) {
        items = jsonData.yml_catalog.shop.offers.offer;
    } else if (jsonData?.items?.item) {
        items = jsonData.items.item;
    } else if (jsonData?.yml_catalog?.shop?.items?.item) {
        items = jsonData.yml_catalog.shop.items.item;
    } else {
        // Fallback: шукаємо перший масив в об'єкті
        const findArray = (obj: any): any[] => {
            for (const key in obj) {
                if (Array.isArray(obj[key])) return obj[key];
                if (typeof obj[key] === 'object') {
                    const found = findArray(obj[key]);
                    if (found.length) return found;
                }
            }
            return [];
        };
        items = findArray(jsonData);
    }

    if (!Array.isArray(items)) items = [items];
    
    log(`3. Found ${items.length} items. Processing...`);

    // --- ОБРОБКА ---
    const models: Record<string, any> = {};

    for (const item of items) {
        if (!item) continue;

        // Витягуємо дані максимально безпечно
        let title = safeStr(item.name || item.title);
        let sku = safeStr(item.vendorCode || item.article || item.code);
        let price = parseFloat(safeStr(item.price).replace(',', '.')) || 0;
        let image = "";
        let color = "";
        
        // Картинка
        if (item.picture) image = Array.isArray(item.picture) ? safeStr(item.picture[0]) : safeStr(item.picture);
        else if (item.photo) image = safeStr(item.photo);

        // Опис
        let desc = safeStr(item.description || item.content || item.content_ua).substring(0, 2000);

        // Колір (з параметрів або поля)
        if (item.color) color = safeStr(item.color);
        if (!color && item.param) {
            const params = Array.isArray(item.param) ? item.param : [item.param];
            const c = params.find((p: any) => safeStr(p?.['@_name']).toLowerCase().includes('колір'));
            if (c) color = safeStr(c['#text']);
        }
        
        // Якщо немає кольору, пробуємо взяти останнє слово назви
        if (!color) {
            const parts = title.split(' ');
            if (parts.length > 2) color = parts[parts.length - 1];
        }

        // Чистимо назву від кольору (щоб отримати назву моделі)
        let modelName = title;
        if (color) {
            modelName = title.replace(new RegExp(color, 'gi'), '').trim();
            // Також прибираємо зайві символи в кінці
            modelName = modelName.replace(/[-_.,]+$/, '').trim();
        }

        if (modelName.length < 3) modelName = title; // Якщо зрізали зайве

        // ГЕНЕРУЄМО ВЛАСНИЙ ID (RBR-slug)
        const myId = `RBR-${generateSlugId(modelName)}`;

        // Ініціалізація моделі
        if (!models[myId]) {
            models[myId] = {
                external_id: myId,
                title: modelName,
                description: desc,
                category: detectCategory(title, safeStr(item.categoryId || item.group)),
                price: provider === 'toptime' ? Math.ceil(price * eurRate) : price,
                image_url: image,
                sku: myId, // Наш артикул
                base_sku: myId,
                variants: [],
                updated_at: new Date().toISOString(),
                in_stock: false,
                amount: 0
            };
        }

        // Додаємо варіант
        // Визначаємо наявність
        let stock = 0;
        let variantSizes: any[] = [];

        // Логіка розмірів
        if (item.sizes?.size) {
            const sArr = Array.isArray(item.sizes.size) ? item.sizes.size : [item.sizes.size];
            sArr.forEach((s: any) => {
                const qty = parseInt(safeStr(s['@_in_stock'] || s['@_amount']).replace(/\D/g, '')) || 0;
                const modPrice = parseFloat(safeStr(s['@_modifier'])) || models[myId].price;
                stock += qty;
                variantSizes.push({
                    label: safeStr(s['#text'] || "STD"),
                    stock_available: qty,
                    price: modPrice
                });
            });
        } else {
            stock = parseInt(safeStr(item.amount || item.count || item.count2 || item.in_stock).replace(/\D/g, '')) || 0;
            variantSizes.push({ 
                label: "ONE SIZE", 
                stock_available: stock, 
                price: models[myId].price 
            });
        }

        // Уникаємо дублів
        const isDup = models[myId].variants.some((v: any) => v.sku_variant === sku);
        if (!isDup) {
            models[myId].variants.push({
                sku_variant: sku, // Артикул постачальника
                color: color || "Standard",
                image: image,
                sizes: variantSizes,
                price: models[myId].price
            });
            models[myId].amount += stock;
            if (stock > 0) models[myId].in_stock = true;
        }
    }

    const finalData = Object.values(models);
    log(`4. Grouped into ${finalData.length} unique models.`);

    // --- ЗАПИС В БАЗУ (Пакетами) ---
    const batchSize = 20; 
    for (let i = 0; i < finalData.length; i += batchSize) {
        const batch = finalData.slice(i, i + batchSize);
        const { error } = await supabaseAdmin.from('products').upsert(batch, { onConflict: 'external_id' });
        if (error) {
            log(`❌ Error batch ${i}: ${error.message}`);
            // Продовжуємо, не падаємо
        }
    }

    log("5. Sync Complete!");

    return NextResponse.json({ success: true, logs: logs });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, logs: logs }, { status: 500 });
  }
}