"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  ArrowLeft, ShoppingBag, Heart, Share2, Truck, ShieldCheck, 
  CheckCircle, Star, Package
} from "lucide-react";

export default function ProductPage() {
  const params = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>("");

  useEffect(() => {
    async function fetchProduct() {
      if (!params.id) return;
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        console.error("Error fetching product:", error);
      } else {
        setProduct(data);
        if (data.image_url) setActiveImage(data.image_url);
      }
      setLoading(false);
    }

    fetchProduct();
  }, [params.id]);

  if (loading) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Завантаження...</div>;
  if (!product) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Товар не знайдено</div>;

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#111] font-sans">
      
      {/* HEADER (Спрощений для сторінки товару) */}
      <header className="bg-white border-b border-gray-200 py-4 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-black transition font-medium">
            <ArrowLeft size={20} /> На головну
          </Link>
          <div className="text-xl font-black italic tracking-tighter">REBRAND</div>
          <div className="w-20"></div> {/* Заглушка для центрування */}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* Хлібні крихти */}
        <div className="text-sm text-gray-500 mb-6 flex gap-2">
           <Link href="/" className="hover:underline">Головна</Link> / 
           <span className="text-gray-900 font-medium truncate max-w-[300px]">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* --- ЛІВА ЧАСТИНА: ФОТОГАЛЕРЕЯ --- */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 aspect-square flex items-center justify-center relative overflow-hidden group">
               {activeImage ? (
                 <img src={activeImage} className="w-full h-full object-contain transition duration-500 group-hover:scale-105" />
               ) : (
                 <div className="flex flex-col items-center text-gray-300">
                   <Package size={64}/>
                   <span>Немає фото</span>
                 </div>
               )}
               <div className="absolute top-4 right-4">
                 <button className="bg-gray-100 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition"><Heart size={24}/></button>
               </div>
            </div>
            {/* Мініатюри (Якщо фото одне - показуємо його ж для прикладу) */}
            {product.image_url && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[product.image_url].map((img, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveImage(img)}
                    className={`w-20 h-20 bg-white rounded-lg border-2 flex-shrink-0 p-1 ${activeImage === img ? "border-blue-600" : "border-transparent"}`}
                  >
                    <img src={img} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* --- ПРАВА ЧАСТИНА: ІНФОРМАЦІЯ --- */}
          <div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 sticky top-24">
              
              {/* Статус і Артикул */}
              <div className="flex justify-between items-start mb-4">
                 <div className="flex gap-2">
                    {product.in_stock ? (
                      <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle size={14}/> В наявності
                      </span>
                    ) : (
                      <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-bold">Немає в наявності</span>
                    )}
                    <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold">Опт</span>
                 </div>
                 <span className="text-gray-400 text-xs">Артикул: {product.sku || product.id}</span>
              </div>

              <h1 className="text-3xl font-bold mb-4 text-gray-900 leading-tight">{product.title}</h1>
              
              {/* Ціна */}
              <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                 <div>
                    <span className="text-sm text-gray-500 block mb-1">Ваша ціна</span>
                    <div className="text-4xl font-black text-gray-900">{product.price} <span className="text-xl font-normal text-gray-500">грн</span></div>
                 </div>
                 <div className="text-right">
                    <span className="text-xs text-gray-400 line-through block">Роздріб: {Math.round(product.price * 1.4)} грн</span>
                    <span className="text-xs text-green-600 font-bold">Вигода 40%</span>
                 </div>
              </div>

              {/* Кнопки дії */}
              <div className="flex gap-4 mb-8">
                <button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-200"
                  onClick={() => alert("Додано в кошик! (Поверніться на головну)")}
                >
                  <ShoppingBag size={20}/> Додати в кошик
                </button>
                <button className="px-4 py-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                  <Share2 size={20} className="text-gray-600"/>
                </button>
              </div>

              {/* Переваги */}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-8">
                 <div className="flex items-center gap-3">
                    <Truck size={20} className="text-blue-500"/> Доставка 1-3 дні
                 </div>
                 <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-purple-500"/> Гарантія якості
                 </div>
                 <div className="flex items-center gap-3">
                    <Star size={20} className="text-yellow-500"/> Брендування
                 </div>
                 <div className="flex items-center gap-3">
                    <Package size={20} className="text-green-500"/> Оптові партії
                 </div>
              </div>

              {/* Опис (HTML від постачальника) */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-bold text-lg mb-4">Характеристики та опис</h3>
                <div 
                  className="prose prose-sm text-gray-600"
                  dangerouslySetInnerHTML={{ __html: product.description || "Опис відсутній" }}
                />
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}