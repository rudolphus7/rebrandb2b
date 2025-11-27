"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import ProductImage from "../../components/ProductImage"; // Імпорт нашого компонента
import { 
  ArrowLeft, ShoppingBag, Heart, Share2, Truck, ShieldCheck, 
  CheckCircle, Star, Package, ChevronRight, Check, Info
} from "lucide-react";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]); // Всі кольори цієї моделі
  const [loading, setLoading] = useState(true);
  
  // Стан для введення кількості розмірів: { "S": 5, "M": 2 }
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});

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

      // 2. Шукаємо ВАРІАНТИ (товари з такою ж назвою)
      // Це дозволить показати всі кольори цієї моделі
      const { data: relatedProducts } = await supabase
        .from("products")
        .select("id, image_url, title, color")
        .eq("title", currentProduct.title); 

      if (relatedProducts) {
        setVariants(relatedProducts);
      }
      
      setLoading(false);
    }

    fetchProductData();
  }, [params.id]);

  // Функція додавання в кошик
  const handleAddToCart = () => {
    const itemsToAdd: any[] = [];
    let hasItems = false;

    // Якщо є розмірна сітка - збираємо вибрані розміри
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        product.sizes.forEach((sizeObj: any) => {
            const qty = quantities[sizeObj.label] || 0;
            if (qty > 0) {
                itemsToAdd.push({
                    id: product.id,
                    title: product.title,
                    image_url: product.image_url,
                    selectedSize: sizeObj.label,
                    price: Math.ceil(sizeObj.price * 1.2), // Ціна з націнкою (якщо треба)
                    quantity: qty
                });
                hasItems = true;
            }
        });
    } else {
        // Якщо товар без розмірів (просто вводимо 1 шт)
        itemsToAdd.push({ 
            id: product.id,
            title: product.title,
            image_url: product.image_url,
            price: product.price,
            quantity: 1 
        });
        hasItems = true;
    }

    if (!hasItems) return alert("Виберіть кількість хоча б для одного розміру");

    // Тут має бути логіка додавання в глобальний контекст кошика
    // Поки що емулюємо це:
    console.log("Adding to cart:", itemsToAdd);
    alert(`Додано ${itemsToAdd.reduce((acc, item) => acc + item.quantity, 0)} одиниць товару!`);
  };

  // Підрахунок загальної суми вибраних товарів
  const calculateTotal = () => {
      if (!product?.sizes) return product?.price || 0;
      let total = 0;
      product.sizes.forEach((s: any) => {
          const qty = quantities[s.label] || 0;
          const price = Math.ceil(s.price * 1.2);
          total += qty * price;
      });
      return total;
  };

  if (loading) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Завантаження...</div>;
  if (!product) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Товар не знайдено</div>;

  // Розрахунок вільного залишку
  const stockFree = (product.amount || 0) - (product.reserve || 0);

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans pb-20">
      
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
        <div className="text-xs text-gray-500 mb-8 flex items-center gap-2 uppercase tracking-widest flex-wrap">
           <Link href="/" className="hover:text-white">Головна</Link> <ChevronRight size={12}/>
           <Link href="/catalog" className="hover:text-white">Одяг</Link> <ChevronRight size={12}/>
           <span className="text-white truncate max-w-[300px]">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* === ЛІВА ЧАСТИНА: ФОТО І ВАРІАНТИ === */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Головне фото */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 aspect-[3/4] flex items-center justify-center relative overflow-hidden group">
               <div className="w-full h-full relative">
                 <ProductImage 
                    src={product.image_url} 
                    alt={product.title} 
                    fill 
                    className="transition duration-500 group-hover:scale-105"
                 />
               </div>
               <button className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-red-500 transition text-white backdrop-blur-md z-10">
                 <Heart size={20}/>
               </button>
            </div>

            {/* В наявності різні кольори (Grid) */}
            {variants.length > 1 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex justify-between">
                        <span>В наявності різні кольори</span>
                        <span className="text-white">{variants.length}</span>
                    </h3>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                        {variants.map((v) => (
                            <Link 
                              key={v.id} 
                              href={`/product/${v.id}`} 
                              className={`aspect-square rounded-lg overflow-hidden border-2 transition relative group ${Number(product.id) === Number(v.id) ? "border-blue-500 ring-2 ring-blue-500/50 ring-offset-2 ring-offset-[#111]" : "border-white/10 hover:border-white"}`}
                              title={v.color || "Варіант"}
                            >
                                <ProductImage src={v.image_url} alt="Color Variant" fill />
                                
                                {/* Індикатор активного кольору */}
                                {Number(product.id) === Number(v.id) && (
                                   <div className="absolute inset-0 bg-blue-500/40 flex items-center justify-center backdrop-blur-[1px]">
                                      <Check size={20} className="text-white drop-shadow-md stroke-[3]"/>
                                   </div>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
          </div>

          {/* === ПРАВА ЧАСТИНА: ІНФО І ТАБЛИЦЯ === */}
          <div className="lg:col-span-7">
            <div className="sticky top-24">
              
              {/* Заголовок */}
              <div className="mb-6 border-b border-white/10 pb-6">
                 <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-white leading-tight">{product.title}</h1>
                 <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                    <span className="flex items-center gap-2 bg-[#222] px-3 py-1 rounded-md border border-white/5">
                        Артикул: <span className="text-white font-mono">{product.sku}</span>
                    </span>
                    {product.color && (
                        <span className="flex items-center gap-2 bg-[#222] px-3 py-1 rounded-md border border-white/5">
                            Колір: <span className="text-white font-bold">{product.color}</span>
                        </span>
                    )}
                    <span className="flex items-center gap-2">Бренд: <span className="text-white font-bold">Gildan</span></span>
                 </div>
              </div>

              {/* Ціна (Головна) */}
              <div className="flex justify-between items-center mb-8">
                 <div className="text-5xl font-black text-white tracking-tight">
                    {product.price} <span className="text-2xl font-medium text-gray-500">грн</span>
                 </div>
                 <div className="text-right">
                    {stockFree > 0 ? (
                      <div className="flex flex-col items-end">
                          <span className="text-green-400 bg-green-900/20 px-4 py-1.5 rounded-full text-sm font-bold border border-green-900/30 flex items-center gap-2 mb-1">
                            <CheckCircle size={16}/> В наявності
                          </span>
                          <span className="text-xs text-gray-500">Доставка 1-3 дні</span>
                      </div>
                    ) : (
                      <span className="text-red-400 bg-red-900/20 px-4 py-1.5 rounded-full text-sm font-bold border border-red-900/30">
                        Очікується
                      </span>
                    )}
                 </div>
              </div>

              {/* ТАБЛИЦЯ РОЗМІРІВ (ОСНОВНИЙ ЕЛЕМЕНТ) */}
              {product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0 ? (
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden mb-8 shadow-2xl">
                      <div className="grid grid-cols-4 bg-[#252525] p-4 text-xs text-gray-300 font-bold uppercase tracking-wider text-center border-b border-white/10">
                          <div className="text-left pl-2">Розмір / Ціна</div>
                          <div>На складі</div>
                          <div>Доступно</div>
                          <div>Замовлення</div>
                      </div>
                      <div className="divide-y divide-white/5">
                          {product.sizes.map((size: any, idx: number) => {
                              const sizePrice = Math.ceil(size.price * 1.2);
                              const available = size.stock_available || 0;
                              return (
                                  <div key={idx} className="grid grid-cols-4 p-4 items-center text-center hover:bg-white/5 transition group">
                                      <div className="text-left pl-2">
                                          <div className="font-black text-xl text-white group-hover:text-blue-400 transition">{size.label}</div>
                                          <div className="text-xs text-gray-500 font-mono">{sizePrice} грн/шт</div>
                                      </div>
                                      <div className="text-sm font-mono text-gray-500">{size.stock_total}</div>
                                      <div className="text-sm font-mono text-green-500 font-bold">
                                          <span className={`px-2 py-1 rounded-md ${available > 0 ? "bg-green-900/20 border border-green-900/50" : "text-gray-600 bg-gray-800"}`}>
                                              {available}
                                          </span>
                                      </div>
                                      <div className="flex justify-center">
                                          <input 
                                            type="number" 
                                            min="0"
                                            max={available}
                                            placeholder="0"
                                            disabled={available === 0}
                                            className="w-24 bg-black border border-white/20 rounded-lg p-2 text-center text-white focus:border-blue-500 outline-none font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed transition focus:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val > available) return; // Захист від введення більше ніж є
                                                setQuantities({...quantities, [size.label]: val});
                                            }}
                                          />
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ) : (
                  <div className="p-6 bg-yellow-900/10 border border-yellow-700/30 rounded-xl text-yellow-200 mb-8 flex gap-3 items-center">
                      <Info size={24}/> 
                      <div>
                          <p className="font-bold">Розмірна сітка не завантажена</p>
                          <p className="text-xs opacity-70">Спробуйте оновити сторінку або зверніться до менеджера.</p>
                      </div>
                  </div>
              )}

              {/* ПІДСУМОК І КНОПКА */}
              <div className="bg-[#222] p-6 lg:p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl mb-8">
                  <div>
                      <p className="text-gray-400 text-xs uppercase tracking-widest mb-1 font-bold">Загальна сума</p>
                      <div className="text-4xl font-black text-white tracking-tight">
                          {Object.values(quantities).some(v => v > 0) ? calculateTotal() : 0} 
                          <span className="text-xl font-normal text-gray-500 ml-2">грн</span>
                      </div>
                  </div>
                  <button 
                    onClick={handleAddToCart}
                    className="w-full md:w-auto bg-white text-black hover:bg-blue-500 hover:text-white font-bold px-10 py-5 rounded-xl flex items-center justify-center gap-3 transition duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                  >
                    <ShoppingBag size={24}/> <span className="uppercase tracking-widest text-sm">Додати в кошик</span>
                  </button>
              </div>

              {/* Жовтий бокс (Доставка) */}
              <div className="p-5 bg-[#332a00] border border-yellow-700/30 rounded-xl flex gap-4 items-start">
                  <Truck className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                  <div>
                      <h4 className="text-yellow-500 font-bold text-sm mb-1 uppercase tracking-wide">Важливо про доставку</h4>
                      <p className="text-yellow-200/70 text-xs leading-relaxed">
                          Товар знаходиться на віддаленому складі. Відвантаження відбувається протягом 1-3 робочих днів. 
                          Ми гарантуємо якість кожної одиниці товару.
                      </p>
                  </div>
              </div>

              {/* Опис і Таби */}
              <div className="mt-12 border-t border-white/10 pt-10">
                  <div className="flex gap-8 border-b border-white/10 pb-4 mb-8 overflow-x-auto">
                      <button className="text-white font-bold border-b-2 border-blue-500 pb-4 -mb-4.5 px-2 whitespace-nowrap">Характеристики</button>
                      <button className="text-gray-500 hover:text-white transition pb-4 px-2 whitespace-nowrap">Додатковий опис</button>
                      <button className="text-gray-500 hover:text-white transition pb-4 px-2 whitespace-nowrap">Макет нанесення</button>
                  </div>
                  <div 
                    className="prose prose-invert prose-sm text-gray-400 max-w-none leading-relaxed"
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