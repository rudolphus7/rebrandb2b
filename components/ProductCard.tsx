'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useWishlist } from './WishlistContext';

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
    display_variants?: { color: string; image: string }[]; // Новий проп
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleItem } = useWishlist();
  const isDefaultActive = isInWishlist(product.id);

  // Стейт для зміни головної картинки при наведенні на мініатюру
  const [currentImage, setCurrentImage] = useState(product.image_url);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(price) + ' грн';
  };

  const hasDiscount = product.old_price && product.old_price > product.base_price;

  // Беремо перші 5 варіантів, щоб не перевантажувати картку
  const variantsToShow = product.display_variants?.slice(0, 5) || [];
  const moreCount = (product.display_variants?.length || 0) - 5;

  return (
    <div className="group block bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col relative">

      {/* ФОТО (Клікабельне посилання на товар) */}
      <Link href={`/product/${product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-gray-50 dark:bg-black p-0 block">
        {currentImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={currentImage}
            alt={product.title}
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900">
            Немає фото
          </div>
        )}

        {hasDiscount && (
          <div className="absolute top-4 left-4 z-10 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-1 rounded-md uppercase">
            Акція
          </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleItem(product.id);
          }}
          className={`absolute top-3 right-3 text-gray-400 hover:text-red-500 transition bg-black/50 p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 z-20 ${isDefaultActive ? 'text-red-500 opacity-100' : ''}`}
        >
          <Heart size={18} fill={isDefaultActive ? "currentColor" : "none"} />
        </button>
      </Link>

      {/* ІНФО */}
      <div className="p-4 flex flex-col flex-grow">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 text-gray-900 dark:text-gray-100 hover:text-blue-500 transition cursor-pointer h-[50px]">
            {product.title}
          </h3>
        </Link>

        <div className="text-xs text-gray-500 mb-3">
          Арт: {product.vendor_article}
        </div>

        {/* --- МІНІАТЮРИ КОЛЬОРІВ --- */}
        {variantsToShow.length > 0 ? (
          <div className="flex gap-2 mb-3 h-8 items-center">
            {variantsToShow.map((v, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-md border border-gray-200 dark:border-white/10 p-0.5 cursor-pointer hover:border-black dark:hover:border-white transition-colors"
                onMouseEnter={() => setCurrentImage(v.image)} // При наведенні міняємо велике фото
                onMouseLeave={() => setCurrentImage(product.image_url)} // Прибиранні - повертаємо дефолтне
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.image} alt={v.color} className="w-full h-full object-cover rounded-sm" title={v.color} />
              </div>
            ))}
            {moreCount > 0 && (
              <Link href={`/product/${product.slug}`} className="text-[10px] text-gray-400 hover:text-black">
                +{moreCount}
              </Link>
            )}
          </div>
        ) : (
          // Якщо варіантів немає, залишаємо пусте місце, щоб картки були однієї висоти
          <div className="h-8 mb-3"></div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100 dark:border-white/5">
          <div className="flex flex-col">
            {hasDiscount && product.old_price && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.old_price)}
              </span>
            )}
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatPrice(product.base_price)} <span className="text-xs font-normal text-gray-500">грн</span>
            </span>
          </div>

          <button className="bg-white text-black w-10 h-10 flex items-center justify-center rounded-xl hover:bg-blue-500 hover:text-white transition shadow-lg active:scale-95">
            <ShoppingBag size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}