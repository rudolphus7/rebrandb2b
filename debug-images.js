const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rsoqtrjafzqvlofueufp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb3F0cmphZnpxdmxvZnVldWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIxODY0NywiZXhwIjoyMDc5Nzk0NjQ3fQ.VgL-n6Rnk9b9J0QaznxwCVOO7sSw7qK7h0JhjffCnJo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    console.log('--- Checking product_images counts ---');
    const { count, error: cError } = await supabase
        .from('product_images')
        .select('*', { count: 'exact', head: true });

    console.log('Total images in DB:', count);

    console.log('\n--- Checking Sample Product Images ---');
    // Get a product that has multiple images
    const { data: samples, error: sError } = await supabase
        .from('product_images')
        .select('product_id, image_url, color, is_main')
        .limit(10);

    console.log('Sample Data:', JSON.stringify(samples, null, 2));

    if (samples && samples.length > 0) {
        const productId = samples[0].product_id;
        console.log(`\n--- All images for product ${productId} ---`);
        const { data: allForProduct } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', productId);
        console.log(JSON.stringify(allForProduct, null, 2));

        console.log('\n--- Product Info ---');
        const { data: product } = await supabase
            .from('products')
            .select('id, title, vendor_article')
            .eq('id', productId)
            .single();
        console.log(product);
    }
}

checkData();
