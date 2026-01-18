'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BrandingOptions,
    PrintPlacement,
    PrintSize,
    PrintMethod,
    PLACEMENT_LABELS,
    SIZE_LABELS,
    METHOD_LABELS,
} from '@/lib/brandingTypes';
import { calculateBrandingPrice, getBrandingPriceBreakdown } from '@/lib/brandingPricing';

interface BrandingConfiguratorProps {
    value: BrandingOptions;
    onChange: (options: BrandingOptions) => void;
    onLogoChange: (file: File | null, preview: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/tiff',
    'image/tif',
    'application/pdf',
    'application/postscript', // AI, EPS
    'application/illustrator',
    'image/x-eps',
    'image/eps',
];

export default function BrandingConfigurator({
    value,
    onChange,
    onLogoChange,
}: BrandingConfiguratorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string>('');

    const handleFileValidation = (file: File): boolean => {
        setError('');

        if (!ACCEPTED_FORMATS.includes(file.type)) {
            setError('Підтримуються: PNG, JPG, SVG, PDF, AI, EPS, TIFF');
            return false;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError('Файл занадто великий. Максимум 10MB');
            return false;
        }

        return true;
    };

    const handleFileSelect = (file: File) => {
        if (!handleFileValidation(file)) return;

        // For image files, create preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = e.target?.result as string;
                onLogoChange(file, preview);
            };
            reader.readAsDataURL(file);
        } else {
            // For non-image files (PDF, AI, EPS), use file name as preview
            onLogoChange(file, `file://${file.name}`);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleRemoveLogo = () => {
        onLogoChange(null, '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const updateOption = (field: keyof BrandingOptions, newValue: any) => {
        const updated = { ...value, [field]: newValue };

        // Recalculate price when placement, size, or method changes
        if (field === 'placement' || field === 'size' || field === 'method') {
            updated.price = calculateBrandingPrice(
                field === 'placement' ? newValue : value.placement,
                field === 'size' ? newValue : value.size,
                field === 'method' ? newValue : value.method
            );
        }

        onChange(updated);
    };

    const priceBreakdown = getBrandingPriceBreakdown(
        value.placement,
        value.size,
        value.method
    );

    return (
        <div className="space-y-6">
            {/* Logo Upload */}
            <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 block">
                    Завантажити логотип
                </label>

                <AnimatePresence mode="wait">
                    {!value.logoPreview ? (
                        <motion.div
                            key="upload-zone"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50 dark:bg-black/20'
                                }`}
                        >
                            <Upload className="mx-auto mb-3 text-gray-400" size={32} />
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Перетягніть файл сюди або натисніть для вибору
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                PNG, JPG, SVG, PDF, AI, EPS, TIFF до 10MB
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_FORMATS.join(',')}
                                onChange={handleInputChange}
                                className="hidden"
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success-zone"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative border-2 border-green-500 dark:border-green-400 rounded-2xl p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 shadow-lg"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden border-2 border-green-200 dark:border-green-700 shadow-sm relative group">
                                    {value.logoPreview?.startsWith('data:image') ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={value.logoPreview}
                                            alt="Logo preview"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-2">
                                            <FileText className="w-10 h-10 text-blue-500" />
                                            <span className="text-[8px] text-gray-500 mt-1 text-center font-bold">
                                                {value.logoPreview?.replace('file://', '').split('.').pop()?.toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <CheckCircle2 className="text-green-600" size={24} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle2 className="text-green-600 dark:text-green-400" size={18} />
                                        <p className="text-sm font-bold text-green-700 dark:text-green-400">
                                            Логотип успішно завантажено!
                                        </p>
                                    </div>
                                    <p className="text-xs text-green-600 dark:text-green-500 font-medium">
                                        ✓ Готово до нанесення на товар
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                            Файл прийнято
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRemoveLogo}
                                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors group"
                                    title="Видалити логотип"
                                >
                                    <X size={20} className="text-gray-400 group-hover:text-red-500" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>
                )}
            </div>

            {/* Placement Selector */}
            <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 block">
                    Розміщення принту
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(Object.keys(PLACEMENT_LABELS) as PrintPlacement[])
                        .filter(p => p !== 'none')
                        .map((placement) => (
                            <button
                                key={placement}
                                type="button"
                                onClick={() => updateOption('placement', placement)}
                                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${value.placement === placement
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                {PLACEMENT_LABELS[placement]}
                            </button>
                        ))}
                </div>
            </div>

            {/* Size Selector */}
            <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 block">
                    Розмір принту
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(SIZE_LABELS) as PrintSize[]).map((size) => (
                        <button
                            key={size}
                            type="button"
                            onClick={() => updateOption('size', size)}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${value.size === size
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {SIZE_LABELS[size]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Method Selector */}
            <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 block">
                    Метод нанесення
                </label>
                <div className="grid grid-cols-1 gap-2">
                    {(Object.keys(METHOD_LABELS) as PrintMethod[]).map((method) => (
                        <button
                            key={method}
                            type="button"
                            onClick={() => updateOption('method', method)}
                            className={`p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${value.method === method
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {METHOD_LABELS[method]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                        Вартість брендування
                    </span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {priceBreakdown.total} ₴
                    </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                        <span>Базова ціна ({SIZE_LABELS[value.size]}):</span>
                        <span>{priceBreakdown.base} ₴</span>
                    </div>
                    {priceBreakdown.placement > 0 && (
                        <div className="flex justify-between">
                            <span>Розміщення ({PLACEMENT_LABELS[value.placement]}):</span>
                            <span>+{priceBreakdown.placement} ₴</span>
                        </div>
                    )}
                    {priceBreakdown.method > 0 && (
                        <div className="flex justify-between">
                            <span>Метод ({METHOD_LABELS[value.method]}):</span>
                            <span>+{priceBreakdown.method} ₴</span>
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic">
                    * Ціна вказана за одиницю товару
                </p>
            </div>
        </div>
    );
}
