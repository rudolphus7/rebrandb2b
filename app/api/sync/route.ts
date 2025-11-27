import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { supabase } from '@/lib/supabaseClient';

const SUPPLIER_URL = "https://totobi.com.ua/index.php?dispatch=yml.get&access_key=lg3bjy2gvww";
const MARGIN_PERCENT = 0; 

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
      if (offer.picture) imageUrl = Array.isArray(offer.picture) ? offer.picture[0] : offer.picture;
      if (imageUrl) imageUrl = imageUrl.replace('http://', 'https://');

      // --- 2. ПАРСИНГ КОЛЬОРУ ТА БРЕНДУ (НОВЕ!) ---
      let colorValue = null;
      let brandValue = offer.vendor; // Іноді бренд тут

      if (offer.param) {
        const params = Array.isArray(offer.param) ? offer.param : [offer.param];
        
        // Колір
        const colorParam = params.find((p: any) => p['@_name'] === 'Колір' || p['@_name'] === 'Група Кольорів');
        if (colorParam) colorValue = colorParam['#text'];

        // Бренд (ТМ)
        const brandParam = params.find((p: any) => p['@_name'] === 'ТМ' || p['@_name'] === 'Бренд' || p['@_name'] === 'Виробник');
        if (brandParam) brandValue = brandParam['#text'];
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
        color: colorValue,
        brand: brandValue // <--- ЗАПИСУЄМО БРЕНД
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