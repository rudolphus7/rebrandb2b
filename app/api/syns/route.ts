import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { supabase } from '@/lib/supabaseClient';

const SUPPLIER_URL = "https://totobi.com.ua/index.php?dispatch=yml.get&access_key=lg3bjy2gvww";
const MARGIN_PERCENT = 20; 

export async function GET() {
  try {
    const response = await fetch(SUPPLIER_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error("Не вдалося завантажити YML");
    const xmlText = await response.text();

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonData = parser.parse(xmlText);
    
    // Перевірка структури YML (іноді shop може бути масивом або об'єктом)
    const offers = jsonData.yml_catalog?.shop?.offers?.offer;
    
    if (!offers) {
        throw new Error("Не знайдено товарів у YML файлі");
    }

    // Якщо offers - це не масив (один товар), робимо масивом
    const offersArray = Array.isArray(offers) ? offers : [offers];
    
    let updatedCount = 0;

    for (const offer of offersArray) {
      let basePrice = parseFloat(offer.price);

      // Логіка для текстилю (ціна в розмірах)
      if (basePrice === 0 && offer.textile === 'Y' && offer.sizes && offer.sizes.size) {
        const sizes = Array.isArray(offer.sizes.size) ? offer.sizes.size : [offer.sizes.size];
        if (sizes.length > 0 && sizes[0]['@_modifier']) {
           basePrice = parseFloat(sizes[0]['@_modifier']);
        }
      }

      // Якщо ціна все ще 0 або NaN, пропускаємо або ставимо заглушку
      if (!basePrice || isNaN(basePrice)) basePrice = 0;

      const finalPrice = Math.ceil(basePrice * (1 + MARGIN_PERCENT / 100));

      let imageUrl = null;
      if (offer.picture) {
        imageUrl = Array.isArray(offer.picture) ? offer.picture[0] : offer.picture;
      }

      const productData = {
        external_id: offer['@_id']?.toString(),
        title: offer.name,
        price: finalPrice,
        image_url: imageUrl,
        sku: offer.vendorCode,
        description: offer.description,
        in_stock: offer.amount > 0 || offer['@_available'] === 'true',
        category_external_id: offer.categoryId?.toString()
      };

      if (productData.external_id) {
          await supabase.from('products').upsert(productData, { onConflict: 'external_id' });
          updatedCount++;
      }
    }

    return NextResponse.json({ success: true, message: `Оброблено ${offersArray.length} товарів.` });

  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}