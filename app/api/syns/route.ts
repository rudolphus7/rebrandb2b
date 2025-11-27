import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { supabase } from '@/lib/supabaseClient';

// --- НАЛАШТУВАННЯ ---
const SUPPLIER_URL = "https://totobi.com.ua/index.php?dispatch=yml.get&access_key=lg3bjy2gvww";
const MARGIN_PERCENT = 20; // Твоя націнка у відсотках (зміни на 0, якщо не треба)

export async function GET() {
  try {
    console.log("🔄 Починаємо синхронізацію...");

    // 1. Завантажуємо файл
    const response = await fetch(SUPPLIER_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error("Не вдалося завантажити YML");
    const xmlText = await response.text();

    // 2. Парсимо XML в JSON
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const jsonData = parser.parse(xmlText);
    
    // Отримуємо список товарів (offers)
    const offers = jsonData.yml_catalog.shop.offers.offer;
    
    console.log(`📦 Знайдено товарів у файлі: ${offers.length}`);

    let updatedCount = 0;
    let createdCount = 0;

    // 3. Проходимось по кожному товару
    for (const offer of offers) {
      
      // --- ЛОГІКА ЦІНИ ---
      let basePrice = parseFloat(offer.price);

      // Якщо це текстиль і ціна 0, шукаємо ціну в розмірах
      if (basePrice === 0 && offer.textile === 'Y' && offer.sizes && offer.sizes.size) {
        // Беремо ціну першого розміру (або можна найменшу/найбільшу)
        // YML парсер може повернути або масив sizes, або один об'єкт, треба перевірити
        const sizes = Array.isArray(offer.sizes.size) ? offer.sizes.size : [offer.sizes.size];
        if (sizes.length > 0) {
           // modifier="675.180" -> беремо це число
           basePrice = parseFloat(sizes[0]['@_modifier']);
        }
      }

      // Додаємо націнку
      const finalPrice = Math.ceil(basePrice * (1 + MARGIN_PERCENT / 100));

      // --- ЛОГІКА ФОТО ---
      // Постачальник може дати одне фото (рядок) або масив
      let imageUrl = null;
      if (offer.picture) {
        imageUrl = Array.isArray(offer.picture) ? offer.picture[0] : offer.picture;
      }

      // --- ПІДГОТОВКА ДАНИХ ---
      const productData = {
        external_id: offer['@_id'].toString(), // ID у Totobi
        title: offer.name,
        price: finalPrice,
        image_url: imageUrl,
        sku: offer.vendorCode,
        description: offer.description,
        in_stock: offer.amount > 0 || offer['@_available'] === 'true', // Логіка наявності
        category_external_id: offer.categoryId?.toString()
      };

      // 4. ЗАПИС В БАЗУ (Upsert - оновити якщо є, створити якщо немає)
      const { error, data } = await supabase
        .from('products')
        .upsert(productData, { onConflict: 'external_id' }) // Шукаємо по ID Totobi
        .select();

      if (error) {
        console.error(`❌ Помилка з товаром ${offer.name}:`, error);
      } else {
        // Просто для статистики (не точно, але приблизно)
        updatedCount++; 
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Синхронізація завершена. Оброблено ${offers.length} товарів.`,
      stats: { total: offers.length }
    });

  } catch (error: any) {
    console.error("Critical Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}