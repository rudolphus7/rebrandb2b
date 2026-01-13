'use client';

import { useState, useEffect } from 'react';
import { LayoutGrid, Rows, Filter } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { CatalogSidebar } from '@/components/CatalogSidebar';

interface CatalogLayoutProps {
    products: any[];
    categories: any[];
    availableColors: string[];
    maxPrice: number;
    totalCount: number;
}

export default function CatalogLayout({ products, categories, availableColors, maxPrice, totalCount }: CatalogLayoutProps) {
    // Mobile Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // View Mode State (Persisted)
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

    useEffect(() => {
        // Load saved preference
        const savedMode = localStorage.getItem('catalogViewMode');
        if (savedMode === 'list' || savedMode === 'grid') {
            setViewMode(savedMode);
        }
    }, []);

    const toggleViewMode = (mode: 'list' | 'grid') => {
        setViewMode(mode);
        localStorage.setItem('catalogViewMode', mode);
    };

    return (
        <div className="flex flex-col md:flex-row gap-8">

            {/* SIDEBAR (Controlled) */}
            <CatalogSidebar
                categories={categories}
                availableColors={availableColors}
                maxPrice={maxPrice}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="flex-1">

                {/* === TOOLBAR (Mobile & Desktop Unified) === */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-3 mb-6 flex flex-row justify-between items-center gap-4 border border-gray-100 dark:border-white/10 shadow-sm transition-colors sticky top-20 z-30 md:static">

                    {/* Mobile Filter Button */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-transform"
                    >
                        <Filter size={16} /> Фільтри та Категорії
                    </button>

                    {/* Desktop Spacer (if needed) or just hidden */}
                    <div className="hidden md:block text-lg font-bold">
                        Каталог
                    </div>

                    {/* Right: View Toggle */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                        <button
                            onClick={() => toggleViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#333] shadow-sm text-black dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                            title="1 колонка"
                        >
                            <Rows size={18} />
                        </button>
                        <button
                            onClick={() => toggleViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#333] shadow-sm text-black dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                            title="2 колонки (сітка)"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>

                {/* Product Count (Moved here) */}
                <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 text-right px-1">
                    Знайдено товарів: <span className="font-bold text-black dark:text-white">{totalCount}</span>
                </div>

                {/* === PRODUCT GRID === */}
                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <p className="text-lg font-medium">Товарів не знайдено</p>
                    </div>
                ) : (
                    <div className={`grid gap-4 md:gap-6 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} transition-all duration-300`}>
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}
