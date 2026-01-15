'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCart } from '@/components/CartContext';
import { useWishlist } from '@/components/WishlistContext';
import {
    ShoppingBag,
    FileText,
    ChevronRight,
    Check,
    Package,
    Minus,
    Plus,
    Info,
    ArrowRight,
    Heart
} from 'lucide-react';
import Link from 'next/link';

interface ProductClientProps {
    product: any;
    variants: any[];
}

const LABELS_MAP: Record<string, { text: string, className: string }> = {
    'new': { text: 'Новинка', className: 'bg-green-500 text-white' },
    'sale': { text: 'Sale', className: 'bg-blue-500 text-white' },
    'promo': { text: 'Hot', className: 'bg-red-500 text-white' },
    'hit': { text: 'Хіт', className: 'bg-yellow-400 text-black' },
};

export default function ProductClient({ product, variants }: ProductClientProps) {
    const { addItem } = useCart();
    const { toggleItem, isInWishlist } = useWishlist();
    const isWishlisted = isInWishlist(product.id);
    const labelConfig = product.label ? LABELS_MAP[product.label] : null;

    // --- 1. ОБРОБКА ДАНИХ (Data Processing) ---
    const uniqueColors = useMemo(() => {
        const colors = new Set(variants.map(v => v.color).filter(c => c && c !== 'N/A'));
        return Array.from(colors);
    }, [variants]);

    const allSizes = useMemo(() => {
        const sizes = new Set(variants.map(v => v.size).filter(Boolean));
        const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL'];
        return Array.from(sizes).sort((a, b) => {
            const idxA = sizeOrder.indexOf(a.toUpperCase());
            const idxB = sizeOrder.indexOf(b.toUpperCase());
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            return a.localeCompare(b);
        });
    }, [variants]);

    // --- 2. СТАН (State) ---
    const [selectedColor, setSelectedColor] = useState<string>(uniqueColors[0] || 'Standard');
    const [activeTab, setActiveTab] = useState<'features' | 'description'>('features');
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // Auto-select first size for simplified single-item purchase logic if needed, 
    // but requested design implies "matrix" or "bulk" might be too complex. 
    // For "Studio" feel, we focus on currently selected color variants.

    const currentColorVariants = useMemo(() => {
        let vars = uniqueColors.length === 0 ? variants : variants.filter(v => v.color === selectedColor);
        const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL'];

        return vars.sort((a, b) => {
            const sizeA = a.size ? a.size.toUpperCase() : '';
            const sizeB = b.size ? b.size.toUpperCase() : '';
            const idxA = sizeOrder.indexOf(sizeA);
            const idxB = sizeOrder.indexOf(sizeB);

            if (a.size === 'One Size') return -1;
            if (b.size === 'One Size') return 1;

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            return sizeA.localeCompare(sizeB);
        });
    }, [variants, selectedColor, uniqueColors]);

    useEffect(() => {
        setQuantities({});
    }, [selectedColor]);

    // --- 3. ЛОГІКА КАРТИНОК (Images) ---
    const galleryImages = useMemo(() => {
        // Helper to get image from variant
        const getVariantImage = (v: any) => {
            if (v?.image_url) return v.image_url;
            if (Array.isArray(v?.images) && v.images.length > 0) return v.images[0];
            return null;
        };

        // Find the first variant of the selected color that actually has an image
        const variantWithImage = currentColorVariants.find(v => getVariantImage(v));
        const mainImg = getVariantImage(variantWithImage) || product.image_url;

        const images = [mainImg];

        // Add other variant images if they exist and are unique
        currentColorVariants.forEach(v => {
            const img = getVariantImage(v);
            if (img && !images.includes(img)) images.push(img);
        });

        if (product.image_url && !images.includes(product.image_url)) images.push(product.image_url);

        return images.filter(Boolean);
    }, [product, currentColorVariants]);

    const [mainImage, setMainImage] = useState(galleryImages[0]);

    useEffect(() => {
        if (galleryImages.length > 0) setMainImage(galleryImages[0]);
    }, [galleryImages]);

    // --- ФОРМАТУВАННЯ (Formatting) ---
    const formatPrice = (price: number) =>
        new Intl.NumberFormat('uk-UA', { style: 'decimal', maximumFractionDigits: 0 }).format(price);

    // --- ЛОГІКА ВВОДУ КІЛЬКОСТІ (Quantity Logic) ---
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
                    vendorArticle: product.vendor_article,
                    slug: product.slug
                });
            }
        });
        setQuantities({});
        // Optional: Show success toast or feedback here
    };

    // Helper for simplified price display
    // const basePrice = product.base_price;
    const basePrice = currentColorVariants.length > 0 ? currentColorVariants[0].price : product.base_price;
    const oldPrice = product.old_price;

    // --- 4. MERGE SPECIFICATIONS (Display logic) ---
    const currentSpecifications = useMemo(() => {
        const baseSpecs = { ...product.specifications };
        const selectedVariant = currentColorVariants[0]; // First variant of this color

        if (selectedVariant) {
            // 1. If variant has explicit specifications JSON, merge it
            if (selectedVariant.specifications) {
                Object.assign(baseSpecs, selectedVariant.specifications);
            }

            // 2. Explicitly override 'Група Кольорів' if we have better data
            // Try 'color_group' column, then 'color' column
            if (selectedVariant.color_group) {
                baseSpecs['Група Кольорів'] = selectedVariant.color_group;
            } else if (selectedVariant.color) {
                // Fallback: use the specific color name as the group if no group is defined
                // This ensures it changes from the default parent color
                baseSpecs['Група Кольорів'] = selectedVariant.color;
            }
        }

        return baseSpecs;
    }, [product.specifications, currentColorVariants]);

    return (
        <div className="bg-white dark:bg-[#0a0a0a] min-h-screen font-sans text-gray-900 dark:text-gray-100 pb-32 md:pb-0">

            {/* === MOBILE HEADER (Simple) === */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 sticky top-20 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10">
                <Link href="/catalog" className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                    <ChevronRight className="rotate-180" size={16} /> Назад в каталог
                </Link>
                <span className="font-bold text-sm truncate max-w-[200px]">{product.title}</span>
                <div className="w-8"></div> {/* Spacer balance */}
            </div>

            <main className="container mx-auto px-0 md:px-6 lg:px-8 pt-0 md:pt-12">

                {/* Desktop Back Button */}
                <div className="hidden md:flex items-center gap-2 mb-6">
                    <Link href="/catalog" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                        <ChevronRight className="rotate-180" size={16} /> Назад в каталог
                    </Link>
                </div>

                <div className="flex flex-col lg:flex-row gap-0 lg:gap-16">

                    {/* === LEFT COLUMN: IMAGERY === */}
                    <div className="w-full lg:w-[60%] select-none">

                        {/* Mobile: Horizontal Snap Gallery */}
                        <div className="relative md:hidden">
                            <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-0 aspect-[3/4]">
                                {galleryImages.map((img, i) => (
                                    <div key={i} className="snap-center w-full flex-shrink-0 h-full relative bg-gray-50 dark:bg-[#111]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img} alt={`${product.title} ${i}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                {/* Mobile Indicators (Dots) could go here overlying */}
                            </div>
                            {/* Mobile Badge */}
                            {labelConfig && (
                                <div className={`absolute top-4 left-4 z-10 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm ${labelConfig.className}`}>
                                    {labelConfig.text}
                                </div>
                            )}
                        </div>

                        {/* Desktop: Featured + Grid */}
                        <div className="hidden md:flex flex-col gap-6">
                            <div className="aspect-[4/3] bg-gray-50 dark:bg-[#111] rounded-3xl overflow-hidden relative group cursor-zoom-in">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={mainImage} alt={product.title} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-700 group-hover:scale-105" />
                                {labelConfig && (
                                    <div className={`absolute top-6 left-6 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm ${labelConfig.className}`}>
                                        {labelConfig.text}
                                    </div>
                                )}
                            </div>
                            {/* Thumbnails */}
                            {galleryImages.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {galleryImages.map((img, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setMainImage(img)}
                                            className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 ${mainImage === img ? 'border-black dark:border-white' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={img} alt="thumb" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* === RIGHT COLUMN: INFO === */}
                    <div className="w-full lg:w-[40%] px-4 md:px-0 mt-6 md:mt-0">
                        <div className="flex flex-col gap-8">

                            {/* Title & Price Header */}
                            <div>
                                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black leading-[1.1] mb-4 tracking-tight">
                                    {product.title}
                                </h1>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-3xl font-bold">{formatPrice(basePrice)}</span>
                                        {oldPrice && (
                                            <span className="text-lg text-gray-400 line-through decoration-red-500/50">{formatPrice(oldPrice)}</span>
                                        )}
                                    </div>
                                    <div className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">
                                        ART: {product.vendor_article}
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-100 dark:bg-white/10 w-full" />

                            {/* Color Selector */}
                            {uniqueColors.length > 1 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Колір</label>
                                    <div className="flex flex-wrap gap-3">
                                        {uniqueColors.map(color => {
                                            const v = variants.find(item => item.color === color);
                                            return (
                                                <button
                                                    key={color}
                                                    onClick={() => setSelectedColor(color)}
                                                    className={`group relative px-1 py-1 rounded-full border transition-all ${selectedColor === color ? 'border-black dark:border-white' : 'border-transparent hover:border-gray-200'}`}
                                                >
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 relative">
                                                        {v?.image_url && <img src={v.image_url} alt={color} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-1.5 rounded z-10`}>
                                                        {color}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Size & Matrix Picker (Simplified Visually) */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Оберіть розмір та кількість</label>
                                    <Link href="#" className="text-xs underline text-gray-400 hover:text-black dark:hover:text-white">Таблиця розмірів</Link>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {currentColorVariants.map(variant => {
                                        const qty = quantities[variant.id] || 0;
                                        const isAvailable = variant.available > 0;
                                        return (
                                            <div key={variant.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${qty > 0 ? 'border-black bg-gray-50 dark:border-white dark:bg-white/5' : 'border-gray-100 dark:border-white/10 bg-white dark:bg-[#111]'}`}>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{variant.size === 'One Size' ? variant.color : variant.size}</span>
                                                    <span className={`text-xs font-medium ${isAvailable ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                        {isAvailable ? `В наявності: ${variant.available} шт.` : 'Немає'}
                                                    </span>
                                                </div>

                                                {isAvailable ? (
                                                    <div className="flex items-center gap-2">
                                                        {qty > 0 && (
                                                            <button
                                                                onClick={() => handleQuantityChange(variant.id, -1, variant.available)}
                                                                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[#222] text-black dark:text-white rounded-full shadow-sm hover:bg-gray-100"
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                        )}

                                                        <input
                                                            type="number"
                                                            className="w-12 h-8 text-center border border-gray-200 dark:border-white/20 rounded-lg bg-gray-50 dark:bg-white/5 font-bold outline-none focus:border-black dark:focus:border-white transition-colors"
                                                            value={qty > 0 ? qty : ''}
                                                            onChange={(e) => handleInputChange(variant.id, e.target.value, variant.available)}
                                                            placeholder="0"
                                                        />

                                                        <button onClick={() => handleQuantityChange(variant.id, 1, variant.available)} className="w-8 h-8 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-full shadow-sm hover:opacity-90">
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-300 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">Розпродано</span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Desktop Add to Cart */}
                            <div className="hidden md:block pt-4 border-t border-gray-100 dark:border-white/10">
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <p className="text-gray-500 text-xs uppercase mb-1">Підсумок</p>
                                        <p className="text-3xl font-black">{formatPrice(totalSelectedPrice)} <span className="text-lg text-gray-400 font-normal">грн</span></p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleBulkAddToCart}
                                        disabled={totalSelectedQty === 0}
                                        className="flex-1 bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <ShoppingBag size={20} /> Додати до кошика ({totalSelectedQty})
                                    </button>
                                    <button
                                        onClick={() => toggleItem(product.id)}
                                        className={`w-[60px] rounded-2xl border-2 transition-all flex items-center justify-center ${isWishlisted ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-white/10 text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'}`}
                                    >
                                        <Heart size={24} fill={isWishlisted ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            </div>

                            {/* Description Tabs */}
                            <div className="pt-8">
                                <div className="flex gap-6 border-b border-gray-100 dark:border-white/10 mb-6">
                                    <button onClick={() => setActiveTab('features')} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'features' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}>Характеристики</button>
                                    <button onClick={() => setActiveTab('description')} className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'description' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}>Опис</button>
                                </div>
                                <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                    {activeTab === 'features' ? (
                                        <div className="space-y-2">
                                            {product.material && <div className="flex justify-between py-1 border-b border-gray-50 dark:border-white/5"><span>Матеріал</span> <span className="text-black dark:text-white font-medium">{product.material}</span></div>}
                                            {Object.entries(currentSpecifications).map(([k, v]) => (
                                                <div key={k} className="flex justify-between py-1 border-b border-gray-50 dark:border-white/5"><span>{k}</span> <span className="text-black dark:text-white font-medium">{v as string}</span></div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div dangerouslySetInnerHTML={{ __html: product.description || 'Опис відсутній' }} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === НИЖНІЙ БЛОК: ЗВЕДЕНА МАТРИЦЯ === */}
                <div className="bg-[#1a1a1a] text-white rounded-[32px] p-8 lg:p-12 shadow-2xl overflow-hidden border border-white/5 transition-colors mt-12 mb-12">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-3xl font-black text-white">Загальна наявність на складах</h3>
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div> Обрано
                            <div className="w-2 h-2 rounded-full bg-gray-500 ml-2"></div> Доступно
                        </div>
                    </div>

                    <div className="overflow-x-auto pb-4">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr>
                                    <th className="py-5 pl-6 font-bold text-gray-400 text-xs uppercase tracking-widest border-b border-white/10 w-72">
                                        Модель / Колір
                                    </th>
                                    {allSizes.map(size => (
                                        <th key={size} className="py-5 font-bold text-white text-center text-sm w-24 border-b border-white/10 bg-[#222]">
                                            {size === 'One Size' ? 'Універсальний' : size}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {uniqueColors.map(color => {
                                    const variantWithImg = variants.find(v => v.color === color);
                                    const imgUrl = variantWithImg?.image_url || product.image_url;
                                    const isCurrentRow = selectedColor === color;

                                    return (
                                        <tr
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`group cursor-pointer transition-all duration-300 ${isCurrentRow ? 'bg-blue-900/10' : 'hover:bg-white/5'}`}
                                        >
                                            <td className="py-5 pl-6 pr-6">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-14 h-16 rounded-xl overflow-hidden border p-1 flex-shrink-0 shadow-sm transition-all ${isCurrentRow ? 'border-blue-500' : 'border-white/10 bg-white'}`}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={imgUrl} alt={color} className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className={`font-bold text-base transition-colors ${isCurrentRow ? 'text-blue-400' : 'text-white'}`}>{color}</div>
                                                </div>
                                            </td>

                                            {allSizes.map(size => {
                                                const v = variants.find(vr => vr.color === color && vr.size === size);
                                                const available = v ? v.available : 0;
                                                const qty = v ? quantities[v.id] || 0 : 0;
                                                const isSelected = qty > 0;

                                                return (
                                                    <td key={size} className="py-5 text-center align-middle relative group/cell">
                                                        {available > 0 ? (
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div
                                                                    className={`text-base font-bold transition-all duration-300 ${isSelected ? 'text-blue-400 scale-125' : 'text-white group-hover/cell:scale-110'}`}
                                                                >
                                                                    {available}
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="absolute -top-1 right-2 w-5 h-5 bg-blue-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white shadow-lg">
                                                                        {qty}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center opacity-10">
                                                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
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

            </main >

            {/* === MOBILE STICKY FOOTER === */}
            < div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-white/10 p-4 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] safe-area-pb" >
                <div className="flex gap-3 items-center">
                    <button
                        onClick={() => toggleItem(product.id)}
                        className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all ${isWishlisted ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-white/10 text-gray-400'}`}
                    >
                        <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Разом</span>
                        <span className="text-xl font-black leading-none">{formatPrice(Math.max(basePrice, totalSelectedPrice))}</span>
                    </div>
                    <button
                        onClick={handleBulkAddToCart}
                        disabled={totalSelectedQty === 0 && false /* Allow sticking even if 0 to prompt selection? No, standard logic */}
                        className={`flex-1 ${totalSelectedQty > 0 ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 text-gray-400'} py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]`}
                    >
                        {totalSelectedQty > 0 ? (
                            <>У кошик ({totalSelectedQty})</>
                        ) : (
                            <>Оберіть розмір</>
                        )}
                    </button>
                </div>
            </div >

        </div >
    );
}