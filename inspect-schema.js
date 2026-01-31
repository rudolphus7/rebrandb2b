const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://rsoqtrjafzqvlofueufp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb3F0cmphZnpxdmxvZnVldWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTg2NDcsImV4cCI6MjA3OTc5NDY0N30.KTxlGKGXbF-9Qm8yXNvr7Mc2Wyx_htNWPoD10GkJLxM'
);

async function inspect() {
    console.log('--- Inspecting Products ---');
    const { data: products, error: pError } = await supabase.from('products').select('*').limit(1);
    if (pError) console.error('Products Error:', pError);
    else if (products && products.length > 0) console.log('Product Columns:', Object.keys(products[0]));
    else console.log('No products found');

    console.log('\n--- Inspecting Variants ---');
    const { data: variants, error: vError } = await supabase.from('product_variants').select('*').limit(1);
    if (vError) console.error('Variants Error:', vError);
    else if (variants && variants.length > 0) {
        console.log('Variant Columns:', Object.keys(variants[0]));
        console.log('Variant Data Sample:', JSON.stringify(variants[0], null, 2));
    }
    else console.log('No variants found');
}

inspect();
