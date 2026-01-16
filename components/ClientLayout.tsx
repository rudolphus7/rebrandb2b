'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import CartDrawer from '@/components/CartDrawer';
import { ThemeProvider } from '@/components/ThemeContext';
import { CartProvider } from '@/components/CartContext';
import { WishlistProvider } from '@/components/WishlistContext';
import { Suspense, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";

import GlobalPopupManager from "./GlobalPopupManager";
import ActivityTracker from "./ActivityTracker";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Hide Header and Sidebar on admin pages
    const isAdmin = pathname?.startsWith('/admin');

    // Track Last Visit (Throttled 1hr)
    useEffect(() => {
        const performTracking = async (session: any) => {
            if (!session?.user) return;

            const lastUpdate = localStorage.getItem('last_visit_update_ts');
            const now = Date.now();
            const throttleTime = 15 * 60 * 1000; // 15 minutes throttle

            if (!lastUpdate || now - parseInt(lastUpdate) > throttleTime) {
                console.log("Tracking visit for:", session.user.email);
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

                    console.log("Saving updates:", updates);

                    const { error } = await supabase
                        .from('profiles')
                        .update(updates)
                        .eq('id', session.user.id);

                    if (error) console.error("DB Update Error:", error);

                    localStorage.setItem('last_visit_update_ts', now.toString());
                } catch (err: any) {
                    console.error("Last visit update failed", err);
                }
            } else {
                // console.log("Tracking throttled");
            }
        };

        // 1. Initial Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) performTracking(session);
        });

        // 2. Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                localStorage.removeItem('last_visit_update_ts'); // Force update
                if (session) performTracking(session);
            } else if (event === 'SIGNED_OUT') {
                localStorage.removeItem('last_visit_update_ts');
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname]);

    return (
        <CartProvider>
            <WishlistProvider>
                <ThemeProvider>
                    <GlobalPopupManager />
                    <ActivityTracker />
                    {!isAdmin && <Suspense fallback={<div className="h-20" />}><Header /></Suspense>}
                    {children}
                    {!isAdmin && <CartDrawer />}
                </ThemeProvider>
            </WishlistProvider>
        </CartProvider>
    );
}
