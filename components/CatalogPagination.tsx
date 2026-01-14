'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface CatalogPaginationProps {
    currentPage: number;
    totalPages: number;
}

export default function CatalogPagination({ currentPage, totalPages }: CatalogPaginationProps) {
    const searchParams = useSearchParams();

    const createPageUrl = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        return `/catalog?${params.toString()}`;
    };

    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Logic to visually construct the pagination (1 ... 4 5 6 ... 10)
    const getPageNumbers = () => {
        const pages = [];
        const showMax = 5; // Total visible numbers excluding first/last

        if (totalPages <= showMax + 2) {
            // Show all if few
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first
            pages.push(1);

            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Adjust window if close to boundaries
            if (currentPage <= 3) {
                end = 4;
            }
            if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            if (start > 2) {
                pages.push('...');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages - 1) {
                pages.push('...');
            }

            // Always show last
            pages.push(totalPages);
        }
        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="mt-12 flex justify-center items-center gap-2 pb-12 select-none">
            {/* PREV */}
            <Link
                href={hasPrevPage ? createPageUrl(currentPage - 1) : '#'}
                className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${!hasPrevPage ? 'border-gray-200 dark:border-white/10 text-gray-300 dark:text-gray-600 cursor-not-allowed pointer-events-none' : 'border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'}`}
                aria-disabled={!hasPrevPage}
            >
                <ChevronLeft size={20} />
            </Link>

            {/* NUMBERS */}
            <div className="flex items-center gap-1 mx-2">
                {pageNumbers.map((p, idx) => (
                    <div key={idx}>
                        {p === '...' ? (
                            <span className="w-8 h-10 flex items-center justify-center text-gray-400">...</span>
                        ) : (
                            <Link
                                href={createPageUrl(p as number)}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${currentPage === p
                                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                    }`}
                            >
                                {p}
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            {/* NEXT */}
            <Link
                href={hasNextPage ? createPageUrl(currentPage + 1) : '#'}
                className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${!hasNextPage ? 'border-gray-200 dark:border-white/10 text-gray-300 dark:text-gray-600 cursor-not-allowed pointer-events-none' : 'border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'}`}
                aria-disabled={!hasNextPage}
            >
                <ChevronRight size={20} />
            </Link>
        </div>
    );
}
