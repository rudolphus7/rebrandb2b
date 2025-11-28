"use client";

import Link from "next/link";
import { CheckCircle, ArrowRight, Home } from "lucide-react";
import { useEffect } from "react";
import { confetti } from "canvas-confetti"; // Якщо хочете салют (опціонально)

export default function OrderSuccessPage() {
  
  return (
    <div className="min-h-screen bg-[#111] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        
        {/* Декоративний фон */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>

        <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle size={48} className="text-green-500" />
            </div>
        </div>

        <h1 className="text-3xl font-black uppercase mb-2">Замовлення прийнято!</h1>
        <p className="text-gray-400 mb-8">
          Дякуємо за покупку. Наш менеджер вже отримав сповіщення і скоро зателефонує вам для підтвердження деталей.
        </p>

        <div className="space-y-3">
            <Link href="/" className="block w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2">
                <Home size={20}/> На головну
            </Link>
            <Link href="/catalog" className="block w-full bg-[#252525] text-white font-bold py-4 rounded-xl hover:bg-[#333] transition border border-white/5">
                Переглянути інші товари
            </Link>
        </div>

      </div>
    </div>
  );
}