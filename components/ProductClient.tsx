'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCart } from '@/components/CartContext';
import {
    ShoppingBag,
    FileText,
    ChevronRight,
    Check,
    Package,
    Minus,
    Plus,
    Info,
    ArrowRight // <<-- ДОДАНО
} from 'lucide-react';
import Link from 'next/link';

interface ProductClientProps {
    product: any;
    variants: any[];
}

export default function ProductClient({ product, variants }: ProductClientProps) {
    const { addItem } = useCart();

    // --- 1. ОБРОБКА ДАНИХ ---
    const uniqueColors = useMemo(() => {
        const colors = new Set(variants.map(v => v.color).filter(c => c && c !== 'N/A'));
        return Array.from(colors);
    }, [variants]);

    const allSizes = useMemo(() => {
        const sizes = new Set(variants.map(v => v.size).filter(s => s && s !== 'One Size'));
        const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL'];
        return Array.from(sizes).sort((a, b) => {
            const idxA = sizeOrder.indexOf(a);
            const idxB = sizeOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            return a.localeCompare(b);
        });
    }, [variants]);

    // --- 2. СТАН ---
    const [selectedColor, setSelectedColor] = useState<string>(uniqueColors[0] || 'Standard');
    const [activeTab, setActiveTab] = useState<'features' | 'description'>('features');
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    const currentColorVariants = useMemo(() => {
        if (uniqueColors.length === 0) return variants;
        return variants.filter(v => v.color === selectedColor);
    }, [variants, selectedColor, uniqueColors]);

    useEffect(() => {
        setQuantities({});
    }, [selectedColor]);

    // --- 3. ЛОГІКА КАРТИНОК ---
    const galleryImages = useMemo(() => {
        const mainImg = currentColorVariants[0]?.image_url || product.image_url;
        const images = [mainImg];
        currentColorVariants.forEach(v => {
            if (v.image_url && !images.includes(v.image_url)) images.push(v.image_url);
        });
        if (product.image_url && !images.includes(product.image_url)) images.push(product.image_url);
        return images.filter(Boolean);
    }, [product, currentColorVariants]);

    const [mainImage, setMainImage] = useState(galleryImages[0]);

    useEffect(() => {
        if (galleryImages.length > 0) setMainImage(galleryImages[0]);
    }, [galleryImages]);

    // --- ФОРМАТУВАННЯ ---
    const formatPrice = (price: number) =>
        new Intl.NumberFormat('uk-UA', { style: 'decimal', maximumFractionDigits: 0 }).format(price);

    // --- ЛОГІКА ВВОДУ КІЛЬКОСТІ ---
    const handleQuantityChange = (variantId: string, delta: number, max: number) => {
        setQuantities(prev => {
            const current = prev[variantId] || 0;
            const newValue = Math.max(0, Math.min(max, current + delta));
            if (newValue === 0) {
                const { [variantId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [variantId]: newValue };
        });
    };

    const handleInputChange = (variantId: string, value: string, max: number) => {
        const num = parseInt(value) || 0;
        const newValue = Math.max(0, Math.min(max, num));
        setQuantities(prev => {
            if (newValue === 0) {
                const { [variantId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [variantId]: newValue };
        });
    };

    const totalSelectedQty = Object.values(quantities).reduce((a, b) => a + b, 0);
    const totalSelectedPrice = Object.entries(quantities).reduce((sum, [id, qty]) => {
        const v = variants.find(v => v.id === id);
        return sum + (v ? v.price * qty : 0);
    }, 0);

    // --- ДОДАВАННЯ В КОШИК (BULK) ---
    const handleBulkAddToCart = () => {
        Object.entries(quantities).forEach(([variantId, qty]) => {
            const variant = variants.find(v => v.id === variantId);
            if (variant && qty > 0) {
                addItem({
                    id: variant.supplier_sku,
                    productId: product.id,
                    title: product.title,
                    image: variant.image_url || product.image_url,
                    price: variant.price,
                    color: variant.color,
                    size: variant.size,
                    vendorArticle: product.vendor_article
                });
            }
        });
        setQuantities({});
    };

    return (
        <div className="bg-background min-h-screen py-10 font-sans text-foreground antialiased transition-colors duration-300">

            <div className="container mx-auto px-4 py-8"></div>
            <div className="container mx-auto px-4 max-w-[1440px]">

                {/* Хлібні крихти */}
                <div className="text-xs font-medium text-gray-400 mb-8 flex items-center gap-3">
                    <Link href="/" className="hover:text-black dark:hover:text-white transition">Головна</Link> <ChevronRight size={14} className="text-gray-300" />
                    <Link href="/catalog" className="hover:text-black dark:hover:text-white transition">Каталог</Link> <ChevronRight size={14} className="text-gray-300" />
                    <span className="font-semibold text-gray-900 dark:text-white line-clamp-1">{product.title}</span>
                </div>

                {/* === ВЕРХНІЙ БЛОК === */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-[32px] p-8 lg:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-white/5 flex flex-col lg:flex-row gap-16 mb-12 transition-colors duration-300">

                    {/* --- ЛІВА ЧАСТИНА: ФОТО + СЕЛЕКТОР КОЛЬОРІВ --- */}
                    <div className="w-full lg:w-[50%] flex flex-col gap-10">

                        {/* Галерея */}
                        <div className="flex gap-6 h-[550px]">
                            <div className="flex flex-col gap-4 w-24 overflow-y-auto scrollbar-hide flex-shrink-0 py-2 pl-2">
                                {galleryImages.map((img, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setMainImage(img)}
                                        className={`w-20 h-24 rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 bg-white shadow-sm ${mainImage === img ? 'ring-2 ring-black ring-offset-2 scale-105' : 'hover:shadow-md hover:scale-105 opacity-80 hover:opacity-100'}`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img} alt={`View ${i}`} className="w-full h-full object-contain p-2" />
                                    </div>
                                ))}
                            </div>

                            <div className="flex-1 bg-gray-50 dark:bg-[#111] rounded-[32px] flex items-center justify-center p-10 relative overflow-hidden group border border-gray-100 dark:border-white/5 transition-colors">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={mainImage} alt={product.title} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 mix-blend-multiply dark:mix-blend-normal" />

                                {product.old_price && (
                                    <div className="absolute top-6 left-6 bg-[#FF3B30] text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest shadow-lg shadow-red-500/20">
                                        Sale
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* СЕЛЕКТОР КОЛЬОРІВ (ФОТО) */}
                        {uniqueColors.length > 1 && (
                            <div>
                                <p className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                                    Колір:
                                    <span className="font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#333] px-3 py-1 rounded-full text-sm">{selectedColor}</span>
                                </p>
                                <div className="flex gap-4 flex-wrap">
                                    {uniqueColors.map(color => {
                                        const variant = variants.find(v => v.color === color);
                                        const imgUrl = variant?.image_url || product.image_url;

                                        return (
                                            <button
                                                key={color}
                                                onClick={() => setSelectedColor(color)}
                                                className={`w-16 h-20 rounded-2xl border-2 overflow-hidden transition-all duration-300 relative group shadow-sm ${selectedColor === color ? 'border-black ring-2 ring-black ring-offset-2 scale-105' : 'border-transparent hover:border-gray-200 hover:shadow-md hover:scale-105'}`}
                                                title={color}
                                            >
                                                <div className="absolute inset-0 bg-white">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={imgUrl} alt={color} className="w-full h-full object-contain p-1.5" />
                                                </div>
                                                {selectedColor === color && (
                                                    <div className="absolute top-1 right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center text-white shadow-sm">
                                                        <Check size={12} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- ПРАВА ЧАСТИНА: ІНФО ТА BULK ORDER --- */}
                    <div className="w-full lg:w-[50%] flex flex-col relative">

                        {/* Заголовок та Артикул */}
                        <div className="mb-8">
                            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-3 leading-tight tracking-tight">
                                {product.title}
                            </h1>
                            <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                                <span className="bg-gray-100 px-3 py-1 rounded-full">Арт: {product.vendor_article}</span>
                                {product.brand && <span className="flex items-center gap-1"><Info size={14} /> Бренд: {product.brand}</span>}
                            </div>
                        </div>

                        {/* Блок Вводу Розмірів */}
                        <div className="mb-6 bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm">
                            <div className="bg-[#FAFAFA] px-6 py-4 border-b border-gray-100 flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <span className="w-[35%]">Розмір та Ціна</span>
                                <span className="w-[25%] text-center">Наявність</span>
                                <span className="w-[40%] text-right">Кількість</span>
                            </div>

                            <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto custom-scrollbar">
                                {currentColorVariants.map((variant) => {
                                    const qty = quantities[variant.id] || 0;
                                    const isAvailable = variant.available > 0;

                                    return (
                                        <div key={variant.id} className={`flex items-center justify-between p-5 transition-all duration-200 ${qty > 0 ? 'bg-blue-50/50' : 'hover:bg-[#FAFAFA]'}`}>

                                            {/* 1. Назва та Ціна */}
                                            <div className="w-[35%] flex flex-col">
                                                <span className="text-lg font-bold text-[#111] mb-0.5">
                                                    {variant.size === 'One Size' ? 'Універсальний' : variant.size}
                                                </span>
                                                <span className="text-sm text-gray-500 font-medium">
                                                    {formatPrice(variant.price)} грн / шт
                                                </span>
                                            </div>

                                            {/* 2. Наявність */}
                                            <div className="w-[25%] text-center flex flex-col items-center justify-center">
                                                {isAvailable ? (
                                                    <>
                                                        <span className="text-base font-bold text-gray-900 dark:text-white">{variant.available}</span>
                                                        <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mt-0.5">На складі</span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1.5 rounded-full">Немає</span>
                                                )}
                                            </div>

                                            {/* 3. Ввід кількості (Сучасний Stepper) */}
                                            <div className="w-[40%] flex justify-end">
                                                <div className={`flex items-center bg-[#F3F4F6] rounded-full p-1 w-36 shadow-sm transition-all ${isAvailable ? '' : 'opacity-40 pointer-events-none'}`}>
                                                    <button
                                                        onClick={() => handleQuantityChange(variant.id, -1, variant.available)}
                                                        className="w-9 h-9 flex items-center justify-center bg-white hover:bg-gray-50 text-black rounded-full shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                                        disabled={qty === 0}
                                                    >
                                                        <Minus size={16} strokeWidth={2.5} />
                                                    </button>
                                                    <input
                                                        type="text"
                                                        value={qty === 0 ? '' : qty}
                                                        onChange={(e) => handleInputChange(variant.id, e.target.value, variant.available)}
                                                        className="w-full h-full text-center bg-transparent font-bold text-lg focus:outline-none text-gray-900 dark:text-white px-2"
                                                        placeholder="0"
                                                    />
                                                    <button
                                                        onClick={() => handleQuantityChange(variant.id, 1, variant.available)}
                                                        className="w-9 h-9 flex items-center justify-center bg-black dark:bg-white hover:bg-black/90 dark:hover:bg-gray-200 text-white dark:text-black rounded-full shadow-sm transition-all active:scale-95"
                                                    >
                                                        <Plus size={16} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {currentColorVariants.length === 0 && (
                                <div className="p-8 text-center text-gray-400 font-medium">Варіанти відсутні для цього кольору.</div>
                            )}
                        </div>

                        {/* ПІДСУМОК ТА КНОПКИ (Sticky Bottom Bar) */}
                        <div className="mt-auto bg-[#111] text-white p-8 rounded-[32px] shadow-2xl shadow-black/10 relative overflow-hidden group">
                            {/* Фоновий патерн (опціонально) */}
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-gray-100 via-[#111] to-[#111] pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col md:flex-row items-end justify-between mb-8 gap-6">
                                <div>
                                    <p className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Обрано товарів:</p>
                                    <p className="text-3xl font-black flex items-baseline gap-2">
                                        {totalSelectedQty}
                                        <span className="text-lg font-medium text-gray-500">шт.</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Загальна вартість:</p>
                                    <div className="flex items-baseline justify-end gap-3">
                                        <p className="text-4xl lg:text-5xl font-black text-white tracking-tight">{formatPrice(totalSelectedPrice)}</p>
                                        {product.old_price && totalSelectedPrice > 0 && (
                                            <p className="text-xl text-gray-500 line-through decoration-red-500/50">
                                                {formatPrice(Object.entries(quantities).reduce((sum, [id, qty]) => sum + (product.old_price! * qty), 0))}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 flex gap-4">
                                <button
                                    onClick={handleBulkAddToCart}
                                    disabled={totalSelectedQty === 0}
                                    className="flex-1 bg-white text-black font-black text-lg py-5 rounded-2xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    <ShoppingBag size={22} strokeWidth={2.5} />
                                    <span>Додати до кошика</span>
                                    <ArrowRight size={22} strokeWidth={2.5} className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                </button>
                                <button className="px-8 border-2 border-white/20 text-white rounded-2xl font-bold hover:bg-white/10 hover:border-white/40 transition-all flex items-center justify-center" title="Завантажити КП">
                                    <FileText size={22} strokeWidth={2} />
                                </button>
                            </div>
                        </div>

                        {/* ТАБИ (Сучасні) */}
                        <div className="mt-12">
                            <div className="flex p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl mb-6 w-fit transition-colors">
                                <button
                                    onClick={() => setActiveTab('features')}
                                    className={`px-6 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'features' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                                >
                                    Характеристики
                                </button>
                                <button
                                    onClick={() => setActiveTab('description')}
                                    className={`px-6 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'description' ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                                >
                                    Опис товару
                                </button>
                            </div>

                            <div className="text-base text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-[#1a1a1a] p-8 rounded-[24px] border border-gray-100 dark:border-white/5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-colors">
                                {activeTab === 'features' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                        {product.material && (
                                            <div className="flex justify-between py-3 border-b border-gray-100">
                                                <span className="text-gray-500 font-medium">Матеріал</span>
                                                <span className="font-bold text-[#111]">{product.material}</span>
                                            </div>
                                        )}
                                        {Object.entries(product.specifications || {}).map(([key, value]) => (
                                            <div key={key} className="flex justify-between py-3 border-b border-gray-100 dark:border-white/5">
                                                <span className="text-gray-500 font-medium">{key}</span>
                                                <span className="font-bold text-gray-900 dark:text-white">{value as string}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="prose prose-lg max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: product.description || 'Опис відсутній' }}></div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* === НИЖНІЙ БЛОК: ЗВЕДЕНА МАТРИЦЯ (Теж оновлена) === */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-[32px] p-8 lg:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden border border-gray-100/50 dark:border-white/5 transition-colors">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-10">Загальна наявність на складах</h3>
                    <div className="overflow-x-auto pb-4">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr>
                                    <th className="py-5 pl-6 font-bold text-gray-400 text-xs uppercase tracking-widest border-b-2 border-gray-100 w-72">
                                        Модель / Колір
                                    </th>
                                    {allSizes.map(size => (
                                        <th key={size} className="py-5 font-bold text-gray-900 dark:text-white text-center text-sm w-24 border-b-2 border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#111] transition-colors">
                                            {size}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {uniqueColors.map(color => {
                                    const variantWithImg = variants.find(v => v.color === color);
                                    const imgUrl = variantWithImg?.image_url || product.image_url;
                                    const isCurrentRow = selectedColor === color;

                                    return (
                                        <tr
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`group cursor-pointer transition-all duration-300 ${isCurrentRow ? 'bg-blue-50/40 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                        >
                                            <td className="py-5 pl-6 pr-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-16 bg-white rounded-xl overflow-hidden border border-gray-200 p-1.5 flex-shrink-0 shadow-sm group-hover:shadow-md transition-all">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={imgUrl} alt={color} className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className={`font-bold text-base transition-colors ${isCurrentRow ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{color}</div>
                                                </div>
                                            </td>

                                            {allSizes.map(size => {
                                                const v = variants.find(vr => vr.color === color && vr.size === size);
                                                const available = v ? v.available : 0;
                                                const inputQty = (isCurrentRow && v) ? quantities[v.id] : 0;

                                                return (
                                                    <td key={size} className="py-5 text-center align-middle">
                                                        {available > 0 ? (
                                                            <div className={`text-base font-bold transition-all ${inputQty > 0 ? 'text-blue-600 dark:text-blue-400 scale-125' : 'text-gray-900 dark:text-white group-hover:scale-110'}`}>
                                                                {available}
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center opacity-30">
                                                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                                            </div>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}