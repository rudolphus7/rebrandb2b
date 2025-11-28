"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Truck, Package, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from './CartContext';
import ProductImage from './ProductImage';
import { useRouter } from 'next/navigation';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { cart, totalItems, totalPrice, removeFromCart, updateQuantity } = useCart();
  const router = useRouter();

  // Логіка переходу на Checkout
  const handleCheckout = () => {
    if (cart.length === 0) return;
    onClose();
    router.push('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Фон-затемнення */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[60]"
            onClick={onClose}
          />

          {/* Панель Кошика */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#1a1a1a] border-l border-white/10 z-[70] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#151515]">
              <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                <ShoppingBag size={20} className="text-blue-500"/> Кошик <span className='text-zinc-500'>({totalItems})</span>
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full bg-white/5">
                <X size={24} />
              </button>
            </div>

            {/* Список товарів */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                  <Package size={48} className='opacity-50'/>
                  <p className="uppercase tracking-widest text-xs">Ваш кошик порожній</p>
                  <button onClick={onClose} className="text-blue-500 hover:text-white text-sm">Повернутись до покупок</button>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={index} className="flex gap-4 bg-black/30 p-3 rounded-xl border border-white/10">
                    <div className="w-20 h-20 bg-black rounded-lg overflow-hidden flex-shrink-0">
                      <ProductImage src={item.image_url} alt={item.title} fill />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <h4 className="font-bold text-sm line-clamp-2">{item.title}</h4>
                      <p className="text-xs text-zinc-500">
                        {item.selectedSize ? `Розмір: ${item.selectedSize}` : 'Без розміру'}
                      </p>
                      
                      {/* Управління кількістю */}
                      <div className='flex items-center justify-between mt-2'>
                          <input 
                              type="number" 
                              min="1" 
                              value={item.quantity} 
                              onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                              className='w-16 bg-zinc-800 border border-white/10 rounded-lg text-center text-white text-sm p-1'
                          />
                          <p className="font-bold text-lg text-blue-400">{item.price * item.quantity} ₴</p>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(index)} className="text-gray-500 hover:text-red-500 self-start transition">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Футер кошика */}
            {cart.length > 0 && (
              <div className="p-6 bg-[#151515] border-t border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xl font-bold uppercase tracking-wider">Всього до сплати</span>
                  <span className="text-3xl font-black text-blue-400">{totalPrice} ₴</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-blue-600 hover:text-white transition duration-300 shadow-lg"
                >
                  <Truck size={20}/> <span className="uppercase tracking-widest">Оформити замовлення</span>
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}