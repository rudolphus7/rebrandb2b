"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  ArrowLeft, ShoppingBag, Heart, Share2, Truck, ShieldCheck, 
  CheckCircle, Star, Package, ChevronRight, Check // <--- ДОДАВ CHECK СЮДИ
} from "lucide-react";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]); // Всі кольори цієї моделі
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>("");

  useEffect(() => {
    async function fetchProductData() {
      if (!params.id) return;
      
      // 1. Беремо поточний товар
      const { data: currentProduct, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !currentProduct) {
        setLoading(false);
        return;
      }

      setProduct(currentProduct);
      setActiveImage(currentProduct.image_url);

      // 2. Шукаємо ВАРІАНТИ (товари з такою ж назвою)
      const { data: relatedProducts } = await supabase
        .from("products")
        .select("*")
        .eq("title", currentProduct.title); // Шукаємо за точною назвою

      if (relatedProducts) {
        setVariants(relatedProducts);
      }
      
      setLoading(false);
    }

    fetchProductData();
  }, [params.id]);

  if (loading) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Завантаження...</div>;
  if (!product) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Товар не знайдено</div>;

  // Вираховуємо вільний залишок
  const stockFree = (product.amount || 0) - (product.reserve || 0);

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans">
      
      {/* HEADER */}
      <header className="bg-[#1a1a1a] border-b border-white/10 py-4 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <Link href="/catalog" className="flex items-center gap-2 text-gray-400 hover:text-white transition font-bold text-sm uppercase tracking-wider">
            <ArrowLeft size={18} /> Назад у каталог
          </Link>
          <div className="text-xl font-black italic tracking-tighter">REBRAND</div>
          <div className="w-32"></div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* BREADCRUMBS */}
        <div className="text-xs text-gray-500 mb-8 flex items-center gap-2 uppercase tracking-widest">
           <Link href="/" className="hover:text-white">Головна</Link> <ChevronRight size={12}/>
           <Link href="/catalog" className="hover:text-white">Одяг</Link> <ChevronRight size={12}/>
           <span className="text-white truncate max-w-[300px]">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* --- ЛІВА ЧАСТИНА: ФОТО --- */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 aspect-[3/4] flex items-center justify-center relative overflow-hidden group">
               {activeImage ? (
                 <img src={activeImage} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
               ) : (
                 <div className="flex flex-col items-center text-zinc-700">
                   <Package size={64}/>
                   <span>Немає фото</span>
                 </div>
               )}
               <button className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-red-500 transition text-white backdrop-blur-md"><Heart size={20}/></button>
            </div>
          </div>

          {/* --- ПРАВА ЧАСТИНА: ВАРІАНТИ І ЦІНА --- */}
          <div className="lg:col-span-7">
            <div className="sticky top-24">
              
              <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-4">
                 <div>
                    <h1 className="text-3xl font-bold mb-2 text-white leading-tight">{product.title}</h1>
                    <div className="text-sm text-gray-400 flex gap-4">
                       <span>Артикул: <span className="text-white">{product.sku}</span></span>
                       <span>Бренд: <span className="text-white">Gildan</span></span>
                    </div>
                 </div>
                 <div className="text-right">
                    {stockFree > 0 ? (
                      <span className="text-green-400 bg-green-900/20 px-3 py-1 rounded-full text-xs font-bold border border-green-900/30 flex items-center gap-1">
                        <CheckCircle size={12}/> В наявності
                      </span>
                    ) : (
                      <span className="text-red-400 bg-red-900/20 px-3 py-1 rounded-full text-xs font-bold border border-red-900/30">Очікується</span>
                    )}
                 </div>
              </div>

              {/* ВИБІР КОЛЬОРУ (ВАРІАНТИ) */}
              <div className="mb-8">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Оберіть колір:</h3>
                 <div className="flex flex-wrap gap-3">
                    {variants.map((variant) => (
                       <Link 
                         key={variant.id} 
                         href={`/product/${variant.id}`}
                         className={`w-16 h-20 rounded-lg overflow-hidden border-2 transition relative group ${Number(product.id) === Number(variant.id) ? "border-blue-500 scale-110 shadow-lg shadow-blue-900/20" : "border-white/10 hover:border-white"}`}
                       >
                          {variant.image_url ? (
                             <img src={variant.image_url} className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full bg-zinc-800"></div>
                          )}
                          {/* Індикатор вибору */}
                          {Number(product.id) === Number(variant.id) && (
                             <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                <Check size={20} className="text-white drop-shadow-md"/>
                             </div>
                          )}
                       </Link>
                    ))}
                 </div>
              </div>
              
              {/* ЦІНА ТА ЗАЛИШКИ */}
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 mb-8">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                       <span className="text-sm text-gray-500 block mb-1">Ваша ціна</span>
                       <div className="text-4xl font-black text-white">{product.price} <span className="text-xl font-normal text-gray-500">грн</span></div>
                    </div>
                    
                    {/* Таблиця залишків (Тільки для цього кольору) */}
                    <div className="text-xs space-y-1 text-right">
                       <div className="text-gray-400">На складі: <span className="text-white font-bold ml-1">{product.amount} шт.</span></div>
                       <div className="text-gray-400">Резерв: <span className="text-white font-bold ml-1">{product.reserve} шт.</span></div>
                       <div className="text-gray-400">Доступно: <span className="text-green-400 font-bold ml-1 text-sm">{stockFree} шт.</span></div>
                    </div>
                 </div>

                 <div className="flex gap-4">
                   <button 
                     className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/20 uppercase tracking-widest text-sm"
                     onClick={() => alert("Додано в кошик!")}
                   >
                     <ShoppingBag size={20}/> Купити цей колір
                   </button>
                   <button className="px-4 py-4 border border-white/10 rounded-xl hover:bg-white/5 transition text-gray-400 hover:text-white">
                     <Share2 size={20}/>
                   </button>
                 </div>
              </div>

              {/* Опис */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="font-bold text-lg mb-4 text-white">Опис товару</h3>
                <div 
                  className="prose prose-invert prose-sm text-gray-400 max-w-none"
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