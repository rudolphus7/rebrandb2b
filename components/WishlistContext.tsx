'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface WishlistContextType {
    items: string[]; // List of Product IDs
    toggleItem: (productId: string) => Promise<void>;
    isInWishlist: (productId: string) => boolean;
    isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<string[]>([]);
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Monitor Auth State
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            if (session?.user) {
                fetchWishlist(session.user.id);
            } else {
                setItems([]);
                setIsLoading(false);
            }
        });

        // Initial check
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
            if (session?.user) {
                await fetchWishlist(session.user.id);
            } else {
                setIsLoading(false);
            }
        })();

        return () => subscription.unsubscribe();
    }, []);

    // 2. Fetch Wishlist from DB
    const fetchWishlist = async (userId: string) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('wishlists')
            .select('product_id')
            .eq('user_id', userId);

        if (!error && data) {
            setItems(data.map((row: any) => row.product_id));
        }
        setIsLoading(false);
    };

    // 3. Toggle Item
    const toggleItem = async (productId: string) => {
        if (!user) {
            alert("Будь ласка, увійдіть в акаунт, щоб додати товар в обране");
            return;
        }

        // Optimistic UI Update
        const oldItems = [...items];
        const exists = items.includes(productId);

        let newItems;
        if (exists) {
            newItems = items.filter(id => id !== productId);
        } else {
            newItems = [...items, productId];
        }
        setItems(newItems);

        // DB Sync
        try {
            if (exists) {
                await supabase
                    .from('wishlists')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('product_id', productId);
            } else {
                await supabase
                    .from('wishlists')
                    .insert({ user_id: user.id, product_id: productId });
            }
        } catch (error) {
            console.error("Wishlist sync error:", error);
            setItems(oldItems); // Revert on error
            alert("Помилка збереження. Спробуйте ще раз.");
        }
    };

    const isInWishlist = (productId: string) => items.includes(productId);

    return (
        <WishlistContext.Provider value={{ items, toggleItem, isInWishlist, isLoading }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
