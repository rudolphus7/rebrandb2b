'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Heart, User, Loader2 } from "lucide-react";
import Link from 'next/link';

export default function AdminWishlistPage() {
    const [wishlists, setWishlists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWishlists();
    }, []);

    async function fetchWishlists() {
        setLoading(true);

        // 1. Fetch Wishlists + Products
        const { data: wishData, error: wishError } = await supabase
            .from('wishlists')
            .select(`
                id,
                user_id,
                created_at,
                products:product_id (title, vendor_article, image_url, slug)
            `)
            .order('created_at', { ascending: false });

        if (wishError) {
            console.error("Error fetching wishlists:", wishError);
            setLoading(false);
            return;
        }

        // 2. Fetch Profiles (Manual Join)
        const userIds = Array.from(new Set(wishData?.map(w => w.user_id).filter(Boolean)));

        let profilesMap: Record<string, any> = {};

        if (userIds.length > 0) {
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, email, full_name, company_name, phone')
                .in('id', userIds);

            if (profilesData) {
                profilesData.forEach(p => {
                    profilesMap[p.id] = p;
                });
            }
        }

        // 3. Merge Data
        const mergedData = wishData?.map(item => ({
            ...item,
            profiles: profilesMap[item.user_id] || { email: 'Unknown', company_name: 'Unknown' }
        }));

        setWishlists(mergedData || []);
        setLoading(false);
    }

    // Grouping by User
    const groupedByUser = wishlists.reduce((acc: any, item: any) => {
        const userId = item.profiles?.email || 'Unknown User';
        if (!acc[userId]) {
            acc[userId] = {
                user: item.profiles,
                items: []
            };
        }
        acc[userId].items.push({
            product: item.products,
            added_at: item.created_at
        });
        return acc;
    }, {});

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Heart className="text-red-500 fill-current" /> Аналітика "Обраного"
            </h1>

            {Object.keys(groupedByUser).length === 0 ? (
                <div className="text-center text-gray-500 bg-white dark:bg-[#1a1a1a] p-10 rounded-xl border border-gray-200 dark:border-white/5">
                    Ще ніхто нічого не додав в обране.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {Object.entries(groupedByUser).map(([email, data]: any) => (
                        <div key={email} className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden transition-colors duration-300">
                            <div className="bg-gray-50 dark:bg-[#222] p-4 flex items-center justify-between border-b border-gray-200 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-900/30 p-2 rounded-full text-blue-400">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{data.user?.company_name || data.user?.full_name || 'Без імені'}</h3>
                                        <p className="text-xs text-gray-500">{email} • {data.user?.phone}</p>
                                    </div>
                                </div>
                                <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    {data.items.length} товарів
                                </div>
                            </div>

                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex gap-3 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-white/5 items-center hover:border-blue-500/30 transition-colors">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                            {item.product?.image_url && <img src={item.product?.image_url} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <Link href={`/product/${item.product?.slug}`} target="_blank" className="font-bold text-sm text-gray-900 dark:text-gray-200 truncate block hover:text-blue-500 dark:hover:text-blue-400">
                                                {item.product?.title || 'Unknown Product'}
                                            </Link>
                                            <p className="text-xs text-gray-500">Арт: {item.product?.vendor_article}</p>
                                            <p className="text-[10px] text-gray-600 mt-1">
                                                Додано: {new Date(item.added_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
