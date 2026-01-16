"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

type Popup = {
    id: string;
    title: string;
    content: string;
    image_url: string;
    link_url: string;
    btn_text: string;
    display_pages: string[];
    exclude_pages: string[];
    trigger_delay: number;
    trigger_type: string;
    position: "center" | "bottom_right" | "bottom_left";
    frequency: "session" | "once" | "always";
};

export default function GlobalPopupManager() {
    const pathname = usePathname();
    const [activePopup, setActivePopup] = useState<Popup | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    // 1. Fetch popups on mount (or pathname change)
    useEffect(() => {
        // Reset state on navigation if needed, or keep persistent? 
        // Usually close popups on navigation.
        setIsVisible(false);

        // Check for popups matching this route
        checkPopups();
    }, [pathname]);

    async function checkPopups() {
        // Fetch all active popups (Optimization: could filter by page in SQL, but array logic is easier in JS)
        const { data: popups } = await supabase
            .from("popups")
            .select("*")
            .eq("is_active", true);

        if (!popups || popups.length === 0) return;

        // Filter relevant popups
        const matched = popups.find(p => {
            // 1. Check Exclusion
            if (p.exclude_pages && p.exclude_pages.some((ex: string) => pathname.startsWith(ex))) return false;

            // 2. Check Inclusion
            // Handle "all pages" wildcard specifically
            const isWildcard = p.display_pages && p.display_pages.includes('*');
            // Handle specific paths
            const isSpecific = p.display_pages && p.display_pages.some((inc: string) => inc !== '*' && (pathname === inc || pathname.startsWith(inc)));

            const inDisplay = isWildcard || isSpecific;

            if (!inDisplay) return false;

            // 3. Check Frequency (Storage)
            const storageKey = `popup_seen_${p.id}`;
            if (p.frequency === 'once' && localStorage.getItem(storageKey)) return false;
            if (p.frequency === 'session' && sessionStorage.getItem(storageKey)) return false;

            return true;
        });

        if (matched) {
            setActivePopup(matched);

            setTimeout(() => {
                setIsVisible(true);
            }, (matched.trigger_delay || 0) * 1000);
        }
    }

    function handleClose() {
        if (!activePopup) return;
        setIsVisible(false);

        // Save seen state
        const storageKey = `popup_seen_${activePopup.id}`;
        if (activePopup.frequency === 'once') {
            localStorage.setItem(storageKey, 'true');
        } else if (activePopup.frequency === 'session') {
            sessionStorage.setItem(storageKey, 'true');
        }
    }

    if (!activePopup) return null;

    // LAYOUT VARIANTS
    const isCenter = activePopup.position === 'center';
    const isToast = activePopup.position === 'bottom_right' || activePopup.position === 'bottom_left';

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* OVERLAY (Only for Center Modal) */}
                    {isCenter && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
                            onClick={handleClose}
                        />
                    )}

                    {/* POPUP CONTAINER */}
                    <motion.div
                        initial={{
                            opacity: 0,
                            scale: isCenter ? 0.9 : 1,
                            y: isCenter ? 0 : 50,
                            x: activePopup.position === 'bottom_left' ? -50 : (activePopup.position === 'bottom_right' ? 50 : 0)
                        }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={`fixed z-[1000] 
                ${isCenter ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md' : ''}
                ${activePopup.position === 'bottom_right' ? 'bottom-6 right-6 w-[350px]' : ''}
                ${activePopup.position === 'bottom_left' ? 'bottom-6 left-6 w-[350px]' : ''}
             `}
                    >
                        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden relative flex flex-col">

                            {/* Close Button */}
                            <button onClick={handleClose} className="absolute top-3 right-3 p-1.5 bg-black/10 dark:bg-white/10 rounded-full hover:bg-black/20 transition z-10">
                                <X size={16} />
                            </button>

                            {/* Image */}
                            {activePopup.image_url && (
                                <div className={`relative w-full ${isCenter ? 'h-48' : 'h-32'} bg-gray-100`}>
                                    <img src={activePopup.image_url} alt="" className="w-full h-full object-cover absolute inset-0" />
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-6">
                                {activePopup.title && <h3 className="text-xl font-bold mb-2 pr-6">{activePopup.title}</h3>}

                                {activePopup.content && (
                                    <div className="text-gray-600 dark:text-gray-300 text-sm mb-6 max-h-[200px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: activePopup.content }} />
                                )}

                                {activePopup.link_url && (
                                    <Link href={activePopup.link_url} onClick={handleClose} className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-center py-3 rounded-xl transition">
                                        {activePopup.btn_text}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
