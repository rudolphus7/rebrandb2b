'use server';

import { getProducts, SearchParams } from '@/lib/catalog';

export async function fetchMoreProducts(params: SearchParams) {
    return await getProducts(params);
}
