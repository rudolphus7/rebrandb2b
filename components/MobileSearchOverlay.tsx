'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Initialize Supabase client inside component or importing it (better to create here to avoid props drilling if simple)
// Actually, usually we pass it or import a shared one. Let's assume shared client logic or just create new simple one for search
import { supabase } from '@/lib/supabaseClient';

interface MobileSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MobileSearchOverlay({ isOpen, onClose }: MobileSearchOverlayProps) {
    // Helper function to extract image URL from various formats
    const getImageUrl = (images: any): string => {
        // Debug logging to see exact format
        console.log('📱 Mobile getImageUrl input:', {
            value: images,
            type: typeof images,
            isArray: Array.isArray(images),
            stringified: JSON.stringify(images)
        });

        if (!images) {
            console.log('❌ No images provided');
            return '/placeholder.png';
        }

        // 1. If it's already an array, take the first item
        if (Array.isArray(images)) {
            return images.length > 0 ? images[0] : '/placeholder.png';
        }

        // 2. If it's a string, try to parse it or clean it
        if (typeof images === 'string') {
            let cleanImage = images.trim();

            // Handle Postgres array format: {"url1","url2"} or {url1,url2}
            if (cleanImage.startsWith('{') && cleanImage.endsWith('}')) {
                // Remove outer curly braces
                cleanImage = cleanImage.slice(1, -1).trim();

                // Split by comma and take first element
                const firstItem = cleanImage.split(',')[0].trim();

                // Remove all quotes (both single and double)
                cleanImage = firstItem.replace(/["']/g, '').trim();

                // Return if it's a valid URL or path
                if (cleanImage && (cleanImage.startsWith('http') || cleanImage.startsWith('/'))) {
                    return cleanImage;
                }
            }
            // Handle JSON format: ["url1"]
            else if (cleanImage.startsWith('[') && cleanImage.endsWith(']')) {
                try {
                    const parsed = JSON.parse(cleanImage);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
                } catch (e) {
                    // ignore error
                }
            }
            // Direct URL or path (also remove any quotes)
            else {
                cleanImage = cleanImage.replace(/["']/g, '').trim();
                if (cleanImage && (cleanImage.startsWith('http') || cleanImage.startsWith('/'))) {
                    return cleanImage;
                }
            }
        }

        return '/placeholder.png';
    };

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, [isOpen]);

    // Instant Search Logic with Debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            const trimmedQuery = query.trim();
            const safeQuery = trimmedQuery.replace(/[,%()]/g, ' ').trim();

            if (trimmedQuery.length > 1) {
                setIsLoading(true);
                try {
                    const { data, error } = await supabase
                        .rpc('search_products', { keyword: safeQuery })
                        .limit(10);

                    if (data) {
                        console.log('Mobile search results:', data); // Debug log
                        setResults(data as any);
                    }
                    if (error) {
                        console.error('Mobile search RPC error:', error);
                    }
                } catch (error) {
                    console.error('Search error:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setIsLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleLinkClick = () => {
        onClose();
        setQuery('');
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/catalog?q=${encodeURIComponent(query)}`);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#111] animate-in fade-in slide-in-from-bottom-5 duration-300 flex flex-col">

            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-white/10">
                <button onClick={onClose} className="p-2 -ml-2 text-gray-500 hover:text-black dark:hover:text-white">
                    <X size={24} />
                </button>
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                    <input
                        ref={inputRef}
                        className="w-full bg-gray-100 dark:bg-white/10 text-lg py-2 pl-10 pr-4 rounded-xl outline-none placeholder:text-gray-400 text-black dark:text-white"
                        placeholder="Пошук товарів..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                </form>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10 text-gray-400">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {results.length > 0 ? (
                            results.map(product => (
                                <Link
                                    key={product.id}
                                    href={`/product/${product.slug}`}
                                    onClick={handleLinkClick}
                                    className="flex items-center gap-4 group"
                                >
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-lg overflow-hidden shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={getImageUrl(product.images)}
                                            alt={product.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black dark:text-white truncate group-hover:text-blue-500 transition-colors">
                                            {product.title}
                                        </h4>
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                            {product.price} грн
                                        </p>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300" />
                                </Link>
                            ))
                        ) : (
                            query.length > 1 && (
                                <div className="text-center text-gray-400 py-10">
                                    Нічого не знайдено
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

        </div>
    );
}
