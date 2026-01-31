const { createClient } = require('@supabase/supabase-js');
const { XMLParser } = require('fast-xml-parser');

// Configuration
const SUPABASE_URL = 'https://rsoqtrjafzqvlofueufp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb3F0cmphZnpxdmxvZnVldWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIxODY0NywiZXhwIjoyMDc5Nzk0NjQ3fQ.VgL-n6Rnk9b9J0QaznxwCVOO7sSw7qK7h0JhjffCnJo';
const YML_URL = 'https://totobi.com.ua/index.php?dispatch=yml.get&access_key=lg3bjy2gvww';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizeColor(color) {
    if (!color) return null;
    const c = String(color).toLowerCase();

    if (c.includes('black') || c.includes('чорн') || c.includes('anthra') || c.includes('dark grey') || c.includes('midnight')) return 'Black';
    if (c.includes('white') || c.includes('біл') || c.includes('milk') || c.includes('snow') || c.includes('ivory')) return 'White';
    if (c.includes('grey') || c.includes('gray') || c.includes('сір') || c.includes('silver') || c.includes('carbon')) return 'Grey';
    if (c.includes('blue') || c.includes('синій') || c.includes('блакит') || c.includes('navy') || c.includes('azure') || c.includes('ocean')) return 'Blue';
    if (c.includes('red') || c.includes('червон') || c.includes('burgundy') || c.includes('maroon') || c.includes('wine')) return 'Red';
    if (c.includes('green') || c.includes('зелен') || c.includes('olive') || c.includes('khaki') || c.includes('military')) return 'Green';
    if (c.includes('yellow') || c.includes('жовт') || c.includes('gold') || c.includes('lemon')) return 'Yellow';
    if (c.includes('orange') || c.includes('помаранч') || c.includes('оранж') || c.includes('coral')) return 'Orange';
    if (c.includes('purple') || c.includes('фіолет') || c.includes('violet') || c.includes('lavender')) return 'Purple';
    if (c.includes('pink') || c.includes('рожев') || c.includes('rose') || c.includes('fuchsia')) return 'Pink';
    if (c.includes('brown') || c.includes('коричн') || c.includes('beige') || c.includes('sand') || c.includes('chocolate') || c.includes('bamboo')) return 'Brown';

    return color;
}

async function syncImages() {
    console.log('Fetching YML feed...');
    const response = await fetch(YML_URL);
    const xmlData = await response.text();

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: ""
    });
    const jsonObj = parser.parse(xmlData);
    const offers = jsonObj.yml_catalog.shop.offers.offer;

    console.log(`Found ${offers.length} offers in YML.`);

    // 0. Clear existing images
    console.log('Clearing old product images...');
    await supabase.from('product_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 1. Build Mapping Data
    const { data: products } = await supabase.from('products').select('id, vendor_article');
    const { data: variants } = await supabase.from('product_variants').select('product_id, sku, supplier_sku, color');

    const exactMap = new Map(); // code -> {id, color}
    const prefixMap = new Map(); // prefix -> {id}

    products?.forEach(p => {
        if (!p.vendor_article) return;
        const art = p.vendor_article.trim();
        exactMap.set(art, { id: p.id, color: null });
        exactMap.set(art.toLowerCase(), { id: p.id, color: null });
        const prefix = art.split(/[-_ ]/)[0].trim().toLowerCase();
        if (prefix) prefixMap.set(prefix, { id: p.id });
    });

    variants?.forEach(v => {
        [v.sku, v.supplier_sku].forEach(sku => {
            if (!sku) return;
            const s = sku.trim().toLowerCase();
            exactMap.set(s, { id: v.product_id, color: v.color });
            const prefix = s.split(/[-_ ]/)[0].trim().toLowerCase();
            if (prefix) prefixMap.set(prefix, { id: v.product_id });
        });
    });

    console.log(`Mapping ready: ${exactMap.size} exact rules, ${prefixMap.size} prefix rules.`);

    const imagesToInsert = [];
    const processedProductIds = new Set();
    const processedImages = new Map(); // productId -> Set of URLs
    let countExact = 0;
    let countPrefix = 0;
    let unmatched = new Set();

    for (const offer of offers) {
        const rawVendorCode = offer.vendorCode;
        if (!rawVendorCode) continue;

        const vc = String(rawVendorCode?.['#text'] || rawVendorCode).trim();
        let target = exactMap.get(vc) || exactMap.get(vc.toLowerCase());

        if (target) {
            countExact++;
        } else {
            const prefix = vc.split(/[-_ ]/)[0].trim().toLowerCase();
            target = prefixMap.get(prefix);
            if (target) countPrefix++;
        }

        if (!target) {
            unmatched.add(vc);
            continue;
        }

        const productId = target.id;
        const deducedColor = target.color;

        // Extract images
        let pictures = offer.picture;
        if (!pictures) continue;
        if (!Array.isArray(pictures)) pictures = [pictures];

        if (!processedImages.has(productId)) processedImages.set(productId, new Set());
        const productSet = processedImages.get(productId);

        // 1. Prefer deduced color from our DB (source of truth for variants)
        // 2. Fallback to YML param
        let color = deducedColor || null;

        if (!color && offer.param) {
            const params = Array.isArray(offer.param) ? offer.param : [offer.param];
            const colorParam = params.find(p => p.name === 'Колір' || p.name === 'Група Кольорів' || p.name === 'Цвет');
            if (colorParam) {
                const rawColor = colorParam['#text'] || colorParam;
                color = String(rawColor);
            }
        }

        // Only normalize if it's a simple color name (preserve details like "(wood/black)")
        if (color && !color.includes('(') && !color.includes('/')) {
            color = normalizeColor(color);
        }

        pictures.forEach((url, index) => {
            if (productSet.has(url)) return;
            productSet.add(url);

            imagesToInsert.push({
                product_id: productId,
                image_url: url,
                view_name: index === 0 ? 'front' : (index === 1 ? 'back' : 'side'),
                color: color,
                is_main: index === 0 && !processedProductIds.has(productId)
            });
        });

        processedProductIds.add(productId);

        if (imagesToInsert.length > 500) {
            console.log(`Inserting batch of ${imagesToInsert.length} images...`);
            await insertBatch(imagesToInsert);
            imagesToInsert.length = 0;
        }
    }

    if (imagesToInsert.length > 0) {
        console.log(`Inserting final batch of ${imagesToInsert.length} images...`);
        await insertBatch(imagesToInsert);
    }

    console.log(`\n--- Sync Summary ---`);
    console.log(`Matched (Exact): ${countExact}, Matched (Prefix): ${countPrefix}`);
    console.log(`Unmatched: ${unmatched.size}`);
    console.log('Sync complete!');
}

async function insertBatch(batch) {
    const { error } = await supabase.from('product_images').insert(batch);
    if (error) console.error('Insert Error:', error.message);
}

syncImages().catch(err => console.error('Sync Failed:', err));
