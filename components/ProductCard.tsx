'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useWishlist } from './WishlistContext';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: string; // Needed for wishlist logic
    slug: string;
    title: string;
    base_price: number;
    old_price?: number | null;
    image_url: string | null;
    vendor_article: string;
    total_available: number;
    display_variants?: { color: string; image: string }[];
    label?: string | null; // Added label
  };
}

const LABELS_MAP: Record<string, { text: string, className: string }> = {
  'new': { text: 'Новинка', className: 'bg-green-500 text-white' },
  'sale': { text: 'Sale', className: 'bg-blue-500 text-white' },
  'promo': { text: 'Hot', className: 'bg-red-500 text-white' },
  'hit': { text: 'Хіт', className: 'bg-yellow-400 text-black' },
};

export default function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleItem } = useWishlist();
  const isDefaultActive = isInWishlist(product.id);

  // Стейт для зміни головної картинки при наведенні на мініатюру
  const [currentImage, setCurrentImage] = useState(product.image_url);

  // СИНХРОНІЗАЦІЯ: Якщо пропси змінилися (наприклад, через фільтр), оновлюємо стейт
  useEffect(() => {
    setCurrentImage(product.image_url);
  }, [product.image_url]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(price).replace(/,/g, ' ') + ' ₴';
  };

  const hasDiscount = product.old_price && product.old_price > product.base_price;
  const labelConfig = product.label ? LABELS_MAP[product.label] : null;

  // Беремо перші 5 варіантів, щоб не перевантажувати картку
  const variantsToShow = product.display_variants?.slice(0, 5) || [];
  const moreCount = (product.display_variants?.length || 0) - 5;

  return (
    <div className="group block bg-white dark:bg-[#1a1a1a] rounded-xl md:rounded-2xl border border-transparent md:border-gray-200 dark:md:border-white/5 shadow-sm md:shadow-none hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col relative overflow-hidden ring-1 ring-black/5 md:ring-0">

      {/* ФОТО (Клікабельне посилання на товар) */}
      <Link href={`/product/${product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-gray-50 dark:bg-black p-0 block">
        {currentImage ? (
          <Image
            src={currentImage}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900">
            Немає фото
          </div>
        )}

        {/* CSS Badge Positioning Stack */}
        <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex flex-col gap-1.5 items-start">
          {labelConfig && (
            <div className={`text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded md:rounded-md uppercase tracking-wider shadow-sm ${labelConfig.className}`}>
              {labelConfig.text}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleItem(product.id);
          }}
          className={`absolute top-2 right-2 md:top-3 md:right-3 text-gray-400 hover:text-red-500 transition bg-white/80 dark:bg-black/50 p-2 md:p-2 rounded-full backdrop-blur-sm opacity-100 md:opacity-0 group-hover:opacity-100 z-20 shadow-sm ${isDefaultActive ? 'text-red-500 opacity-100 md:opacity-100' : ''}`}
        >
          <Heart size={16} className="w-4 h-4 md:w-[18px] md:h-[18px]" fill={isDefaultActive ? "currentColor" : "none"} />
        </button>
      </Link>

      {/* ІНФО */}
      <div className="p-3 md:p-4 flex flex-col flex-grow">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold text-sm md:text-lg leading-snug md:leading-tight mb-1.5 md:mb-2 line-clamp-2 text-gray-900 dark:text-gray-100 hover:text-blue-500 transition cursor-pointer min-h-[2.5rem] md:h-[50px]">
            {product.title}
          </h3>
        </Link>

        <div className="text-[10px] md:text-xs text-gray-500 mb-2 md:mb-3">
          Арт: {product.vendor_article}
        </div>

        {/* --- МІНІАТЮРИ КОЛЬОРІВ --- */}
        {variantsToShow.length > 0 ? (
          <div className="flex gap-1.5 md:gap-2 mb-2 md:mb-3 h-6 md:h-8 items-center">
            {variantsToShow.map((v, i) => (
              <div
                key={i}
                className="relative w-6 h-6 md:w-8 md:h-8 rounded md:rounded-lg border border-gray-200 dark:border-white/10 p-0.5 cursor-pointer hover:border-black dark:hover:border-white transition-colors overflow-hidden"
                onMouseEnter={() => setCurrentImage(v.image)} // При наведенні міняємо велике фото
                onMouseLeave={() => setCurrentImage(product.image_url)} // Прибиранні - повертаємо дефолтне
              >
                <Image
                  src={v.image}
                  alt={v.color}
                  fill
                  sizes="32px"
                  className="object-cover rounded-[2px] md:rounded-sm"
                  title={v.color}
                />
              </div>
            ))}
            {moreCount > 0 && (
              <Link href={`/product/${product.slug}`} className="text-[10px] text-gray-400 hover:text-black pl-0.5">
                +{moreCount}
              </Link>
            )}
          </div>
        ) : (
          // Якщо варіантів немає, залишаємо пусте місце, щоб картки були однієї висоти
          <div className="h-6 md:h-8 mb-2 md:mb-3"></div>
        )}

        <div className="mt-auto pt-3 md:pt-4 flex items-end justify-between border-t border-gray-100 dark:border-white/5">
          <div className="flex flex-col">
            {hasDiscount && product.old_price && (
              <span className="text-[10px] md:text-xs text-gray-400 line-through mb-0.5">
                {formatPrice(product.old_price)}
              </span>
            )}
            <span className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white leading-none">
              {formatPrice(product.base_price)}
            </span>
          </div>

          <button className="bg-black dark:bg-white text-white dark:text-black w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl hover:opacity-80 transition shadow-md active:scale-95">
            <ShoppingBag size={16} className="md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}