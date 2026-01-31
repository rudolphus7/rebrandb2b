const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://rsoqtrjafzqvlofueufp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb3F0cmphZnpxdmxvZnVldWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTg2NDcsImV4cCI6MjA3OTc5NDY0N30.KTxlGKGXbF-9Qm8yXNvr7Mc2Wyx_htNWPoD10GkJLxM'
);

async function checkMapping() {
    console.log('--- Sample Product ---');
    const { data: products } = await supabase.from('products').select('id, title, vendor_article').limit(5);
    console.log(JSON.stringify(products, null, 2));

    console.log('\n--- Sample Variants ---');
    const { data: variants } = await supabase.from('product_variants').select('id, product_id, sku, supplier_sku, color').limit(5);
    console.log(JSON.stringify(variants, null, 2));
}

checkMapping();
