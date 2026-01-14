'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, Rows, Filter, Loader2, ChevronUp, Plus } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { CatalogSidebar } from '@/components/CatalogSidebar';
import { fetchMoreProducts } from '@/app/catalog/actions';
import { SearchParams } from '@/lib/catalog';
import CatalogPagination from '@/components/CatalogPagination';

interface CatalogLayoutProps {
    products: any[];
    categories: any[];
    availableColors: string[];
    maxPrice: number;
    totalCount: number;
    searchParams: SearchParams;
    currentPage: number;
    totalPages: number;
}

export default function CatalogLayout({ products: initialProducts, categories, availableColors, maxPrice, totalCount, searchParams, currentPage, totalPages }: CatalogLayoutProps) {
    // Mobile Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // View Mode State (Persisted)
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

    // Pagination State
    const [loadedProducts, setLoadedProducts] = useState<any[]>(initialProducts);
    const [page, setPage] = useState(parseInt(searchParams.page || '1'));
    const [isLoading, setIsLoading] = useState(false);

    // Reset loaded products when initialProducts change (filtes applied)
    useEffect(() => {
        setLoadedProducts(initialProducts);
        setPage(parseInt(searchParams.page || '1'));
    }, [initialProducts, searchParams]);

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

    // Memoize onClose to prevent Sidebar useEffect from triggering unnecessarily
    const handleClose = useCallback(() => {
        setIsSidebarOpen(false);
    }, []);

    const handleLoadMore = async () => {
        setIsLoading(true);
        const nextPage = page + 1;

        try {
            // Call server action
            const result = await fetchMoreProducts({ ...searchParams, page: nextPage.toString() });

            if (result.products && result.products.length > 0) {
                setLoadedProducts(prev => [...prev, ...result.products]);
                setPage(nextPage);
            }
        } catch (error) {
            console.error("Failed to load more products:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const hasMore = loadedProducts.length < totalCount;

    return (
        <div className="flex flex-col md:flex-row gap-8 relative">

            {/* Back to Top Button (Fixed) */}
            <button
                onClick={handleScrollToTop}
                className="fixed bottom-8 right-8 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md p-3 rounded-full shadow-lg border border-gray-200 dark:border-white/10 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group hidden md:flex items-center justify-center"
                title="Вгору"
            >
                <ChevronUp className="group-hover:-translate-y-1 transition-transform" size={24} />
            </button>

            {/* SIDEBAR (Controlled) */}
            <CatalogSidebar
                categories={categories}
                availableColors={availableColors}
                maxPrice={maxPrice}
                isOpen={isSidebarOpen}
                onClose={handleClose}
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
                    <span className="mx-2 text-gray-300">|</span>
                    Показано: <span className="font-bold text-black dark:text-white">{loadedProducts.length}</span>
                </div>

                {/* === PRODUCT GRID === */}
                {loadedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <p className="text-lg font-medium">Товарів не знайдено</p>
                    </div>
                ) : (
                    <>
                        <div className={`grid gap-4 md:gap-6 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} transition-all duration-300`}>
                            {loadedProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {/* Show More Button */}
                        {hasMore && (
                            <div className="mt-12 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={isLoading}
                                    className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-black dark:text-white font-bold py-4 px-12 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} /> Завантаження...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={20} className="bg-black text-white dark:bg-white dark:text-black rounded-full p-0.5" /> Показати більше
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Numbered Pagination (Aligned with Grid) */}
                        {totalPages > 1 && (
                            <CatalogPagination currentPage={currentPage} totalPages={totalPages} />
                        )}
                    </>
                )}

            </div>
        </div>
    );
}
