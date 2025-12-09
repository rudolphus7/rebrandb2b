'use client';

import Link from 'next/link';
import { CheckCircle, ArrowRight, ShoppingBag } from 'lucide-react';

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-[#111] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        
        {/* Анімація успіху */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 rounded-full"></div>
            <CheckCircle size={100} className="text-green-500 relative z-10 animate-in zoom-in duration-500" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight">Замовлення прийнято!</h1>
          <p className="text-gray-400 text-lg">
            Дякуємо за покупку. Менеджер зв'яжеться з вами найближчим часом для підтвердження деталей.
          </p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
            <p className="text-sm text-gray-500 mb-2">Що далі?</p>
            <ul className="text-left text-sm space-y-3 text-gray-300">
                <li className="flex gap-3">
                    <span className="bg-blue-900/50 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    Ми надіслали вам лист з деталями замовлення.
                </li>
                <li className="flex gap-3">
                    <span className="bg-blue-900/50 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    Ваше замовлення вже передано на склад для комплектації.
                </li>
                <li className="flex gap-3">
                    <span className="bg-blue-900/50 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    Очікуйте ТТН у SMS або Telegram.
                </li>
            </ul>
        </div>

        <div className="flex flex-col gap-3">
            <Link 
              href="/" 
              className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <ShoppingBag size={20} /> Продовжити покупки
            </Link>
            
            <Link 
              href="/profile" 
              className="w-full bg-[#222] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-black border border-white/10 transition-colors"
            >
              Перейти в кабінет <ArrowRight size={20} />
            </Link>
        </div>

      </div>
    </div>
  );
}