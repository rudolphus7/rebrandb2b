const { getProducts } = require('./lib/catalog');

async function test() {
    try {
        const { products } = await getProducts({ q: 'кепка' });
        if (products && products.length > 0) {
            console.log('Product Keys:', Object.keys(products[0]));
            if (products[0].product_variants && products[0].product_variants.length > 0) {
                console.log('Variant Keys:', Object.keys(products[0].product_variants[0]));
                console.log('Sample Variant Images:', products[0].product_variants[0].images);
            }
        } else {
            console.log('No products found with query "кепка"');
        }
    } catch (e) {
        console.error('Test Error:', e);
    }
}

test();
