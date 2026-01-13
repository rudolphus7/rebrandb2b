'use client';

import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { LayoutGrid, Grip, Rows } from 'lucide-react';

interface ProductGridProps {
    products: any[];
}

export default function ProductGrid({ products }: ProductGridProps) {
    // 'grid' = 2 columns on mobile, 'list' = 1 column on mobile
    // Default to 1 column ('list') for bigger cards, or 'grid' for density.
    // User asked for option to switch.
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    return (
        <div>
            {/* View Controls (Mobile Only mostly, but can be Desktop too) */}
            <div className="flex justify-end mb-4 md:hidden">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-lg border border-gray-200 dark:border-white/10">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/20 shadow-sm text-black dark:text-white' : 'text-gray-400'}`}
                    >
                        <Rows size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/20 shadow-sm text-black dark:text-white' : 'text-gray-400'}`}
                    >
                        <LayoutGrid size={20} />
                    </button>
                </div>
            </div>

            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} lg:grid-cols-3 xl:grid-cols-3 transition-all duration-300`}>
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}
