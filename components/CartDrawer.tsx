'use client';

import { useCart } from './CartContext';
import Link from 'next/link';

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, totalPrice, isCartOpen, toggleCart } = useCart();

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
              <div key={item.id} className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image || ''} alt={item.title} className="w-full h-full object-contain p-1" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Арт: {item.vendorArticle} | {item.color} {item.size !== 'One Size' && `| ${item.size}`}
                  </p>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 hover:bg-gray-50 dark:hover:bg-white/10">-</button>
                      <span className="px-2 text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-50 dark:hover:bg-white/10">+</button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">{formatPrice(item.price * item.quantity)}</p>
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
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(totalPrice)}</span>
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