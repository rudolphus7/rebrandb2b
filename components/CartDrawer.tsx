'use client';

import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { PLACEMENT_LABELS, SIZE_LABELS, METHOD_LABELS } from '@/lib/brandingTypes';

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, totalPrice, isCartOpen, toggleCart } = useCart();
  const { isAuthenticated } = useAuth();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('uk-UA', { style: 'decimal', maximumFractionDigits: 0 }).format(price) + ' грн';

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Затемнення фону */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={toggleCart}></div>

      {/* Сама панель */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 transition-colors">

        {/* Шапка */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-[#111]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Кошик ({items.length})</h2>
          <button onClick={toggleCart} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Список товарів */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <p>Ваш кошик порожній 😔</p>
              <button onClick={toggleCart} className="mt-4 text-blue-600 dark:text-blue-400 font-medium hover:underline">
                Перейти до каталогу
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 group">
                <Link href={`/product/${item.slug}?color=${encodeURIComponent(item.color)}`} onClick={toggleCart} className="relative w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-white/5 cursor-pointer hover:opacity-80 transition-opacity">
                  <Image
                    src={item.image || ''}
                    alt={item.title}
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                  />
                </Link>
                <div className="flex-1">
                  <Link href={`/product/${item.slug}?color=${encodeURIComponent(item.color)}`} onClick={toggleCart}>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 mb-1 underline decoration-gray-300 hover:decoration-blue-500 hover:text-blue-500 transition-all active:opacity-70">{item.title}</h3>
                  </Link>
                  <p className="text-xs text-gray-500 mb-2">
                    Арт: {item.vendorArticle} | {item.color} {item.size !== 'One Size' && `| ${item.size}`}
                  </p>

                  {/* Branding Info */}
                  {item.branding?.enabled && (
                    <div className="mb-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                          🎨 З брендуванням
                        </span>
                      </div>
                      {item.branding.logoPreview && (
                        <div className="flex items-center gap-2 mb-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.branding.logoPreview}
                            alt="Logo preview"
                            className="w-6 h-6 object-contain bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-white/10"
                          />
                          <span className="text-[9px] text-gray-600 dark:text-gray-400">Логотип</span>
                        </div>
                      )}
                      <div className="text-[9px] text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div>📍 {PLACEMENT_LABELS[item.branding.placement]}</div>
                        <div>📏 {SIZE_LABELS[item.branding.size]}</div>
                        <div>🖨️ {METHOD_LABELS[item.branding.method]}</div>
                      </div>
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                        +{item.branding.price} ₴/шт
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 hover:bg-gray-50 dark:hover:bg-white/10">-</button>
                      <span className="px-2 text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-50 dark:hover:bg-white/10">+</button>
                    </div>
                    <div className="text-right">
                      {isAuthenticated ? (
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatPrice((item.price + (item.branding?.price || 0)) * item.quantity)}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          Увійдіть щоб побачити ціну
                        </p>
                      )}
                      <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 underline mt-1">Видалити</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Футер */}
        {items.length > 0 && (
          <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#111]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600 dark:text-gray-400">Разом:</span>
              {isAuthenticated ? (
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(totalPrice)}</span>
              ) : (
                <Link href="/login" onClick={toggleCart} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Увійдіть щоб побачити ціну
                </Link>
              )}
            </div>
            <Link href="/checkout" onClick={toggleCart} className="block w-full bg-[#222] dark:bg-white text-white dark:text-black text-center font-bold py-4 rounded-xl hover:bg-black dark:hover:bg-gray-200 transition-colors">
              Оформити замовлення
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}