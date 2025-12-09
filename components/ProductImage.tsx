'use client';

import { useState } from 'react';

interface ProductImageProps {
  src: string | null;
  alt: string;
  fill?: boolean; // Щоб підтримати атрибут fill з Next.js
  className?: string;
}

export default function ProductImage({ src, alt, className }: ProductImageProps) {
  const [error, setError] = useState(false);

  // Якщо картинки немає або вона не завантажилась, показуємо сірий фон з іконкою
  if (!src || error) {
    return (
      <div className={`w-full h-full bg-gray-800 flex items-center justify-center text-gray-600 ${className}`}>
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110 ${className}`}
      onError={() => setError(true)}
    />
  );
}