"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Helper to get device type loosely
const getDeviceType = () => {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "tablet";
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "mobile";
    return "desktop";
};

export default function ActivityTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastPathRef = useRef<string | null>(null);

    useEffect(() => {
        // Debounce or check ensures we don't track double fires in strict mode too aggressively, 
        // though distinct path checks usually suffice.
        const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

        if (lastPathRef.current === currentPath) return;
        lastPathRef.current = currentPath;

        trackPageView(currentPath);
    }, [pathname, searchParams]);

    async function trackPageView(path: string) {
        // We only track authenticated users for the CRM (High value data)
        // Anonymous tracking would flood the DB unless we have a specific 'visitor_id' strategy.
        // For this task ("Customer Journey"), linking to a User ID is key.

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Fire and forget (don't await to block UI)
        supabase.from('customer_events').insert({
            user_id: session.user.id,
            event_type: 'PAGE_VIEW',
            path: path,
            details: {
                device: getDeviceType(),
                referrer: document.referrer || null,
                title: document.title
            }
        }).then(({ error }) => {
            if (error) console.error("Tracking Error:", error);
        });
    }

    return null; // Invisible component
}

// Export a helper to track custom events manually (e.g. Add to Cart)
export async function trackEvent(eventType: string, details: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from('customer_events').insert({
        user_id: session.user.id,
        event_type: eventType,
        path: window.location.pathname,
        details: {
            ...details,
            device: getDeviceType()
        }
    });
}
