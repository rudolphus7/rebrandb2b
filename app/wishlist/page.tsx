'use client';

import { useEffect, useState } from "react";
import { useWishlist } from "@/components/WishlistContext";
import { supabase } from "@/lib/supabaseClient";
import WishlistItem from "@/components/WishlistItem";
import { Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function WishlistPage() {
    const { items, isLoading } = useWishlist();
    const [products, setProducts] = useState<any[]>([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        async function loadProducts() {
            if (items.length === 0) {
                setProducts([]);
                return;
            }

            setFetching(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .in('id', items);

            if (data) setProducts(data);
            setFetching(false);
        }

        loadProducts();
    }, [items]);

    if (isLoading || fetching && products.length === 0) {
        return <div className="min-h-screen bg-[#111] flex items-center justify-center text-gray-500">Завантаження обраного...</div>;
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans py-12 transition-colors duration-300">
            <div className="container mx-auto px-4 max-w-5xl">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                        <Heart className="text-red-500" fill="currentColor" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Моє обране</h1>
                        <p className="text-gray-400">{items.length} {items.length === 1 ? 'товар' : 'товарів'}</p>
                    </div>
                </div>

                {products.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {products.map(p => (
                            <WishlistItem key={p.id} product={p} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-gray-50 dark:bg-[#1a1a1a] rounded-3xl border border-dashed border-gray-300 dark:border-white/10 transition-colors">
                        <Heart size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Список порожній</h2>
                        <p className="text-gray-600 dark:text-gray-500 mb-6 max-w-sm mx-auto">Ви ще не додали жодного товару до списку обраного. Перейдіть до каталогу.</p>
                        <Link href="/catalog" className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition">
                            <ArrowLeft size={18} /> Весь каталог
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
