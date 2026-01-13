'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import CartDrawer from '@/components/CartDrawer';
import { ThemeProvider } from '@/components/ThemeContext';
import { CartProvider } from '@/components/CartContext';
import { WishlistProvider } from '@/components/WishlistContext';
import { Suspense } from 'react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Hide Header and Sidebar on admin pages and login page (if it was separate, but it's home now so we might want header there? User said "Admin should not have header")
    // Let's strictly hide on /admin
    const isAdmin = pathname?.startsWith('/admin');

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
