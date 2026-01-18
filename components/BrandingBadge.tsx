'use client';

import { PLACEMENT_LABELS, SIZE_LABELS, METHOD_LABELS } from '@/lib/brandingTypes';

interface BrandingBadgeProps {
    branding: {
        placement: string;
        size: string;
        method: string;
        price: number;
    };
    compact?: boolean;
}

export default function BrandingBadge({ branding, compact = false }: BrandingBadgeProps) {
    if (compact) {
        return (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800 transition-colors">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    🎨 Брендування
                </span>
                <div className="w-px h-3 bg-blue-200 dark:bg-blue-800" />
                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                    +{branding.price} ₴
                </span>
            </div>
        );
    }

    return (
        <div className="group relative overflow-hidden p-4 bg-white dark:bg-zinc-900/50 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/30 transition-all duration-300">
            {/* Accent Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-colors" />

            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Деталі брендування</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Розміщення</span>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {PLACEMENT_LABELS[branding.placement as keyof typeof PLACEMENT_LABELS] || branding.placement}
                    </p>
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Розмір</span>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {SIZE_LABELS[branding.size as keyof typeof SIZE_LABELS] || branding.size}
                    </p>
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Метод</span>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {METHOD_LABELS[branding.method as keyof typeof METHOD_LABELS] || branding.method}
                    </p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Вартість послуги</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                    +{branding.price} ₴
                </span>
            </div>
        </div>
    );
}
