const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    'https://rsoqtrjafzqvlofueufp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb3F0cmphZnpxdmxvZnVldWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTg2NDcsImV4cCI6MjA3OTc5NDY0N30.KTxlGKGXbF-9Qm8yXNvr7Mc2Wyx_htNWPoD10GkJLxM'
);

let output = '';
function log(msg) {
    console.log(msg);
    output += msg + '\n';
}

async function inspect() {
    log('--- Inspecting Products ---');
    const { data: products, error: pError } = await supabase.from('products').select('*').limit(1);
    if (pError) log('Products Error: ' + JSON.stringify(pError));
    else if (products && products.length > 0) log('Product Columns: ' + Object.keys(products[0]).join(', '));
    else log('No products found');

    log('\n--- Inspecting All Tables (via RPC) ---');
    const { data: tables, error: tError } = await supabase.rpc('get_tables');
    if (tError) log('RPC get_tables Error: ' + JSON.stringify(tError));
    else log('Tables: ' + JSON.stringify(tables, null, 2));

    log('\n--- Finished ---');
    fs.writeFileSync('schema-output.txt', output);
}

inspect();
