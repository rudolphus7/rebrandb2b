'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ProductCardProps {
  product: {
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
    <div className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      
      {/* ФОТО (Клікабельне посилання на товар) */}
      <Link href={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-gray-50 p-4 block">
        {currentImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={currentImage}
            alt={product.title}
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
             Немає фото
          </div>
        )}
        
        {hasDiscount && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                Акція
            </div>
        )}
      </Link>

      {/* ІНФО */}
      <div className="p-4 flex flex-col flex-grow">
        <Link href={`/product/${product.slug}`}>
            <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-1 h-[40px] hover:text-blue-600 transition-colors">
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
                        className="w-8 h-8 rounded-md border border-gray-200 p-0.5 cursor-pointer hover:border-black transition-colors"
                        onMouseEnter={() => setCurrentImage(v.image)} // При наведенні міняємо велике фото
                        onMouseLeave={() => setCurrentImage(product.image_url)} // Прибиранні - повертаємо дефолтне
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.image} alt={v.color} className="w-full h-full object-contain rounded-sm" title={v.color}/>
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

        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <div className="flex flex-col">
            {hasDiscount && product.old_price && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.old_price)}
              </span>
            )}
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(product.base_price)}
            </span>
          </div>
          
          <div className="text-right text-xs">
             <span className="text-gray-400 block">Доступно:</span>
             <span className={`font-bold ${product.total_available > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                {product.total_available} шт
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}