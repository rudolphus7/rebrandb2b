const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rsoqtrjafzqvlofueufp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb3F0cmphZnpxdmxvZnVldWZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIxODY0NywiZXhwIjoyMDc5Nzk0NjQ3fQ.VgL-n6Rnk9b9J0QaznxwCVOO7sSw7qK7h0JhjffCnJo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkClothing() {
    console.log('--- Checking for Article 5077-05 (Jacket) ---');
    const { data: product, error: pError } = await supabase
        .from('products')
        .select('id, title, vendor_article')
        .eq('vendor_article', '5077-05')
        .single();

    if (pError) console.log('Product 5077-05 not found:', pError.message);
    else console.log('Found product:', JSON.stringify(product, null, 2));

    console.log('\n--- Checking for general clothing ---');
    const { data: clothing, error: cError } = await supabase
        .from('products')
        .select('id, title, vendor_article')
        .ilike('title', '%куртка%')
        .limit(5);

    console.log('Sample clothing items:', JSON.stringify(clothing, null, 2));
}

checkClothing();
