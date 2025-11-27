import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { supabase } from '@/lib/supabaseClient';

const SUPPLIER_URL = "https://totobi.com.ua/index.php?dispatch=yml.get&access_key=lg3bjy2gvww";
const MARGIN_PERCENT = 20; 

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`🚀 Sync batch: ${offset} - ${offset + limit}`);

    const response = await fetch(SUPPLIER_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error("YML fetch failed");
    const xmlText = await response.text();

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const jsonData = parser.parse(xmlText);
    const allOffers = jsonData.yml_catalog?.shop?.offers?.offer;
    
    if (!allOffers) throw new Error("No offers found");
    const offersArray = Array.isArray(allOffers) ? allOffers : [allOffers];
    const totalOffers = offersArray.length;

    if (offset >= totalOffers) return NextResponse.json({ done: true, total: totalOffers, processed: 0 });

    const chunk = offersArray.slice(offset, offset + limit);

    const productsToUpsert = chunk.map((offer: any) => {
      let basePrice = parseFloat(offer.price);
      let sizesData = [];

      // --- 1. ПАРСИНГ РОЗМІРІВ ---
      if (offer.textile === 'Y' && offer.sizes?.size) {
        const sizesArr = Array.isArray(offer.sizes.size) ? offer.sizes.size : [offer.sizes.size];
        
        if ((basePrice === 0 || isNaN(basePrice)) && sizesArr.length > 0) {
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
      const finalPrice = Math.ceil(basePrice * (1 + MARGIN_PERCENT / 100));

      let imageUrl = null;
      if (offer.picture) {
        // Беремо перше фото, якщо це масив
        let rawUrl = Array.isArray(offer.picture) ? offer.picture[0] : offer.picture;
        
        // 🔥 ФІКС: Примусово міняємо http на https
        if (rawUrl) {
            imageUrl = rawUrl.replace('http://', 'https://');
        }
      }
      // --- 2. ПАРСИНГ КОЛЬОРУ (НОВЕ!) ---
      let colorValue = null;
      if (offer.param) {
        const params = Array.isArray(offer.param) ? offer.param : [offer.param];
        // Шукаємо параметр з назвою "Колір" або "Група Кольорів"
        const colorParam = params.find((p: any) => p['@_name'] === 'Колір' || p['@_name'] === 'Група Кольорів');
        if (colorParam) {
            colorValue = colorParam['#text']; // Наприклад: "Чорний" або "black"
        }
      }

      return {
        external_id: offer['@_id']?.toString(),
        title: offer.name,
        price: finalPrice,
        image_url: imageUrl,
        sku: offer.vendorCode,
        description: offer.description ? offer.description.substring(0, 5000) : "",
        in_stock: offer.amount > 0 || offer['@_available'] === 'true',
        category_external_id: offer.categoryId?.toString(),
        amount: parseInt(offer.amount) || 0,
        reserve: parseInt(offer.reserve) || 0,
        sizes: sizesData,
        color: colorValue // <--- ЗАПИСУЄМО КОЛІР
      };
    }).filter((p: any) => p.external_id && p.title);

    if (productsToUpsert.length > 0) {
        await supabase.from('products').upsert(productsToUpsert, { onConflict: 'external_id' });
    }

    return NextResponse.json({ done: false, total: totalOffers, processed: productsToUpsert.length, nextOffset: offset + limit });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}