'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import CartDrawer from '@/components/CartDrawer';
import { ThemeProvider } from '@/components/ThemeContext';
import { CartProvider } from '@/components/CartContext';
import { WishlistProvider } from '@/components/WishlistContext';
import { Suspense, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Hide Header and Sidebar on admin pages
    const isAdmin = pathname?.startsWith('/admin');

    // Track Last Visit (Throttled 1hr)
    useEffect(() => {
        const trackVisit = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const lastUpdate = localStorage.getItem('last_visit_update_ts');
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;

                if (!lastUpdate || now - parseInt(lastUpdate) > oneHour) {
                    try {
                        let updates: any = { last_visit: new Date().toISOString() };

                        try {
                            const geoRes = await fetch('https://ipwho.is/');
                            const geoData = await geoRes.json();
                            if (geoData.success) {
                                updates.last_ip = geoData.ip;
                                updates.city = geoData.city;
                            }
                        } catch (e) {
                            console.warn("Geo fetch failed", e);
                        }

                        await supabase
                            .from('profiles')
                            .update(updates)
                            .eq('id', session.user.id);

                        localStorage.setItem('last_visit_update_ts', now.toString());
                    } catch (err: any) {
                        console.error("Last visit update failed", err);
                    }
                }
            }
        };
        trackVisit();
    }, [pathname]);

    return (
        <CartProvider>
            <WishlistProvider>
                <ThemeProvider>
                    {!isAdmin && <Suspense fallback={<div className="h-20" />}><Header /></Suspense>}
                    {children}
                    {!isAdmin && <CartDrawer />}
                </ThemeProvider>
            </WishlistProvider>
        </CartProvider>
    );
}
