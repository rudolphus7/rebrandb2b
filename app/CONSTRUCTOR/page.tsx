import { getProducts, getCategories } from '@/lib/catalog';
import ConstructorClient from './components/ConstructorClient';

export default async function ConstructorPage() {
    // Fetch initial data
    const [productsData, categories] = await Promise.all([
        getProducts({ page: '1' }),
        getCategories()
    ]);

    return (
        <div className="constructor-container">
            <ConstructorClient
                initialProducts={productsData.products as any}
                categories={categories as any}
            />
        </div>
    );
}
