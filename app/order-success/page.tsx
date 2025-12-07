"use client";

import { CheckCircle, ArrowRight, Home } from "lucide-react";
import Link from "next/link";

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 shadow-2xl max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 text-green-500 ring-1 ring-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
          <CheckCircle size={48} />
        </div>
        
        <h1 className="text-3xl font-black mb-2 tracking-tight">Замовлення прийнято!</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Дякуємо за покупку. Наш менеджер зв'яжеться з вами найближчим часом для уточнення деталей доставки.
        </p>

        <div className="space-y-3 w-full">
          <Link 
            href="/catalog" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/20"
          >
            <ArrowRight size={20} /> Продовжити покупки
          </Link>
          
          <Link 
            href="/" 
            className="w-full bg-[#222] hover:bg-[#333] text-gray-300 hover:text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition border border-white/5"
          >
            <Home size={20} /> На головну
          </Link>
        </div>
      </div>
    </div>
  );
}