"use client";

import { useState } from "react";
import { Package } from "lucide-react";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fill?: boolean; // Якщо true - поводиться як object-cover на весь блок
}

export default function ProductImage({ src, alt, className = "", fill = false }: ProductImageProps) {
  const [error, setError] = useState(false);

  // 1. Якщо src немає або сталася помилка - показуємо заглушку
  if (!src || error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-[#222] text-zinc-600 ${className} ${fill ? "w-full h-full" : ""}`}>
        <Package size={32} strokeWidth={1.5} />
        {/* <span className="text-[10px] font-bold mt-2 uppercase tracking-widest opacity-50">No Image</span> */}
      </div>
    );
  }

  // 2. Авто-фікс протоколу (HTTP -> HTTPS)
  const secureSrc = src.startsWith("http://") ? src.replace("http://", "https://") : src;

  return (
    <img
      src={secureSrc}
      alt={alt}
      className={`${className} ${fill ? "w-full h-full object-cover" : ""}`}
      onError={() => setError(true)} // Якщо картинка бита - вмикаємо режим помилки
      loading="lazy"
    />
  );
}