import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import crypto from 'crypto'; // Для генерації стабільного ID

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

// --- HELPERS ---

// 1. Безпечний рядок (вирішує toString of undefined)
function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === 'object' && val !== null) {
        // Якщо це масив або об'єкт, пробуємо знайти текст всередині або повертаємо пустий рядок
        if (val['#text']) return String(val['#text']);
        return ""; 
    }
    return String(val).trim();
}

// 2. Генерація ID на основі назви моделі (наш власний артикул)
function generateModelId(cleanTitle: string): string {
    // Створюємо хеш з назви, щоб він був завжди однаковий для однієї моделі
    const hash = crypto.createHash('md5').update(cleanTitle.toLowerCase()).digest('hex').substring(0, 10);
    return `RBR-${hash.toUpperCase()}`; // RBR - Rebrand
}

// 3. Очищення назви від кольору (щоб згрупувати "Футболка Red" і "Футболка Blue")
function cleanModelName(title: string, color: string): string {
    if (!color) return title;
    // Видаляємо колір з назви (case-insensitive)
    const regex = new RegExp(`\\b${color}\\b`, 'gi');
    return title.replace(regex, '').replace(/\s+/g, ' ').trim();
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

    const parser = new XMLParser({ 
        ignoreAttributes: false, 
        attributeNamePrefix: "@_",
        parseTagValue: false 
    });
    const jsonData = parser.parse(xmlText);

    let items: any[] = [];
    
    // Отримання списку (з додатковими перевірками на undefined)
    if (provider === 'toptime') {
        let rawItems = jsonData?.items?.item || jsonData?.yml_catalog?.shop?.items?.item;
        if (!rawItems && jsonData) {
             const keys = Object.keys(jsonData);
             if (keys.length > 0 && jsonData[keys[0]]?.item) rawItems = jsonData[keys[0]].item;
        }
        if (rawItems) items = Array.isArray(rawItems) ? rawItems : [rawItems];
    } else {
        let rawOffers = jsonData?.yml_catalog?.shop?.offers?.offer;
        if (rawOffers) items = Array.isArray(rawOffers) ? rawOffers : [rawOffers];
    }

    if (!items || items.length === 0) {
        return NextResponse.json({ success: false, message: "No items found or XML structure mismatch" });
    }

    // --- ГРУПУВАННЯ ---
    const groupedModels: Record<string, any> = {};
    let skippedCount = 0;

    for (const item of items) {
        try {
            if (!item) continue;

            // --- ВИТЯГУВАННЯ ДАНИХ (БЕЗПЕЧНО) ---
            let supplierSku = "", title = "", price = 0, image = "", description = "", rawCategory = "", brand = "", color = "";
            let sizes: any[] = [];

            if (provider === 'toptime') {
                supplierSku = safeStr(item.article || item.code);
                title = safeStr(item.name);
                const p = parseFloat(safeStr(item.price).replace(',', '.'));
                price = Math.ceil((isNaN(p) ? 0 : p) * eurRate);
                image = safeStr(item.photo);
                description = safeStr(item.content || item.content_ua);
                rawCategory = safeStr(item.group);
                brand = safeStr(item.brand);
                color = safeStr(item.color);
                
                const stock = parseInt(safeStr(item.count2 || item.count || '0').replace(/\D/g, '')) || 0;
                if (stock > 0) {
                    sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
                }
            } else {
                // Totobi
                supplierSku = safeStr(item.vendorCode);
                title = safeStr(item.name);
                const p = parseFloat(safeStr(item.price).replace(',', '.'));
                price = isNaN(p) ? 0 : p;
                
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
                        const stockVal = parseInt(safeStr(s['@_in_stock'] || s['@_amount']).replace(/\D/g, '')) || 0;
                        const modPrice = parseFloat(safeStr(s['@_modifier']).replace(',', '.'));
                        
                        sizes.push({
                            label: safeStr(s['#text'] || "ONE SIZE"),
                            stock_available: stockVal,
                            price: isNaN(modPrice) ? price : modPrice
                        });
                    });
                } else {
                    const stock = parseInt(safeStr(item.amount || item.in_stock).replace(/\D/g, '')) || 0;
                    sizes.push({ label: "ONE SIZE", stock_available: stock, price: price });
                }
            }

            // Якщо немає назви або ціни - це сміття
            if (!title) {
                skippedCount++;
                continue;
            }

            // --- НАША ВЛАСНА ЛОГІКА (ГЕНЕРАЦІЯ ID) ---
            
            // 1. Пробуємо знайти колір в назві, якщо його немає
            if (!color) {
                const parts = title.split(' ');
                // Примітивна евристика: останнє слово часто колір
                if (parts.length > 2) color = parts[parts.length - 1]; 
            }

            // 2. Очищаємо назву від кольору, щоб отримати "Модель"
            // Наприклад: "Футболка Valueweight Червона" -> "Футболка Valueweight"
            const modelName = cleanModelName(title, color);

            // 3. Генеруємо НАШ власний ID для цієї моделі
            const myInternalId = generateModelId(modelName);

            const cleanCategory = detectCategory(title, rawCategory);

            // 4. Створюємо або оновлюємо модель
            if (!groupedModels[myInternalId]) {
                groupedModels[myInternalId] = {
                    external_id: myInternalId, // ТЕПЕР ЦЕ НАШ RBR-XXXX
                    title: modelName,
                    description: description.substring(0, 5000),
                    category: cleanCategory,
                    price: price, // Базова ціна
                    image_url: image,
                    sku: myInternalId, // Наш артикул
                    base_sku: myInternalId, // Для сумісності з фронтом
                    brand: brand,
                    variants: [],
                    updated_at: new Date().toISOString(),
                    in_stock: false,
                    amount: 0
                };
            }

            // 5. Додаємо варіант (колір)
            const isDuplicate = groupedModels[myInternalId].variants.some((v: any) => v.supplier_sku === supplierSku);
            
            if (!isDuplicate) {
                groupedModels[myInternalId].variants.push({
                    supplier_sku: supplierSku, // Зберігаємо артикул постачальника для замовлень
                    color: color || "Standard",
                    image: image,
                    sizes: sizes,
                    price: price
                });
            }

            // Оновлюємо загальний сток
            const totalStock = sizes.reduce((acc, s) => acc + s.stock_available, 0);
            groupedModels[myInternalId].amount += totalStock;
            if (totalStock > 0) groupedModels[myInternalId].in_stock = true;

        } catch (innerErr) {
            console.error("Skipping bad item:", innerErr);
            skippedCount++;
        }
    }

    const finalProducts = Object.values(groupedModels);

    // Запис в базу
    const batchSize = 50;
    for (let i = 0; i < finalProducts.length; i += batchSize) {
        const batch = finalProducts.slice(i, i + batchSize);
        const { error } = await supabaseAdmin.from('products').upsert(batch, { onConflict: 'external_id' });
        if (error) {
            console.error('Supabase Batch Error:', error);
            // Не кидаємо помилку, а йдемо далі
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Processed. Models created: ${finalProducts.length}. Bad items skipped: ${skippedCount}`,
    });

  } catch (error: any) {
    console.error("Sync Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}