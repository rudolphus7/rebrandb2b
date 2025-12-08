"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import ProductImage from "../../components/ProductImage";
import Header from "../../components/Header"; 
import { useCart } from "../../components/CartContext"; 
import CartDrawer from "../../components/CartDrawer"; 
import { 
  CheckCircle, ShoppingBag, ChevronRight, Minus, Plus, Info
} from "lucide-react";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, totalItems } = useCart(); 
  
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  
  // Всі варіанти цієї моделі (різні кольори)
  const [modelVariants, setModelVariants] = useState<any[]>([]);
  
  // Вибір користувача
  const [activeImage, setActiveImage] = useState<string>("");
  
  // Кількість для кожного розміру
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [singleQuantity, setSingleQuantity] = useState(1);

  const [isCartOpen, setIsCartOpen] = useState(false); 

  useEffect(() => {
    async function fetchProduct() {
      if (!params.id) return;
      setLoading(true);

      // 1. Вантажимо поточний товар
      const { data: currentProduct, error } = await supabase
        .from("products")
        .select("*")
        .eq("external_id", params.id)
        .single();

      if (error || !currentProduct) {
        setLoading(false);
        return;
      }

      setProduct(currentProduct);
      setActiveImage(currentProduct.image_url);

      // 2. Шукаємо "братів" по моделі (base_sku)
      // Наприклад, якщо поточний RBR-VEST-OLIVE, шукаємо всі RBR-VEST-...
      if (currentProduct.base_sku) {
          const { data: siblings } = await supabase
            .from('products')
            .select('external_id, title, image_url, variants')
            .eq('base_sku', currentProduct.base_sku);
          
          if (siblings) setModelVariants(siblings);
      } else {
          // Fallback: якщо base_sku ще не заповнився, показуємо тільки себе
          setModelVariants([currentProduct]);
      }

      setLoading(false);
    }
    fetchProduct();
  }, [params.id]);

  // --- ОБЧИСЛЕННЯ ---

  // 1. Унікальні кольори для перемикача зліва
  // Ми беремо перший варіант з поля 'variants' кожного товару-брата, щоб дізнатися колір
  const colorOptions = modelVariants.map(variant => {
      // Шукаємо колір всередині JSON variants або в назві
      let colorName = "Standard";
      let image = variant.image_url;

      if (variant.variants && variant.variants.length > 0) {
          colorName = variant.variants[0].color;
          image = variant.variants[0].image || image;
      }
      
      return {
          id: variant.external_id,
          name: colorName,
          image: image,
          isActive: variant.external_id === product?.external_id
      };
  });

  // 2. Розміри поточного товару
  // Беремо їх з поля variants поточного товару
  const currentSizes = product?.variants && product.variants.length > 0 
      ? product.variants[0].sizes 
      : [];
  
  // Сортування розмірів (XXS -> 4XL)
  const sizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "4XL", "5XL", "ONE SIZE"];
  currentSizes.sort((a: any, b: any) => sizeOrder.indexOf(a.label) - sizeOrder.indexOf(b.label));

  // Загальний залишок
  const totalStock = currentSizes.reduce((acc: number, s: any) => acc + (s.stock_available || 0), 0);
  const hasRealSizes = currentSizes.length > 0 && currentSizes[0].label !== "ONE SIZE" && currentSizes[0].label !== "STD";

  // --- HANDLERS ---

  const handleAddToCart = () => {
      const itemsToAdd: any[] = [];
      
      // Логіка з розмірами (Таблиця)
      if (hasRealSizes) {
          let hasItems = false;
          currentSizes.forEach((s: any) => {
              const qty = quantities[s.label] || 0;
              if (qty > 0) {
                  itemsToAdd.push({
                      id: product.id,
                      title: `${product.title} (${s.label})`, // Додаємо розмір в назву
                      image_url: activeImage,
                      price: Math.ceil(s.price * 1.2),
                      quantity: qty,
                      selectedSize: s.label
                  });
                  hasItems = true;
              }
          });
          if (!hasItems) { alert("Оберіть кількість хоча б для одного розміру"); return; }
      } 
      // Логіка без розмірів (Проста кнопка)
      else {
          if (singleQuantity <= 0) return;
          const price = currentSizes[0]?.price || product.price;
          itemsToAdd.push({
              id: product.id,
              title: product.title,
              image_url: activeImage,
              price: Math.ceil(price * 1.2),
              quantity: singleQuantity,
              selectedSize: "ONE SIZE"
          });
      }

      itemsToAdd.forEach(i => addToCart(i));
      setIsCartOpen(true);
      setQuantities({});
  };

  const calculateTotal = () => {
      if (hasRealSizes) {
          return currentSizes.reduce((acc: number, s: any) => {
              const qty = quantities[s.label] || 0;
              return acc + (qty * Math.ceil(s.price * 1.2));
          }, 0);
      }
      const price = currentSizes[0]?.price || product.price || 0;
      return singleQuantity * Math.ceil(price * 1.2);
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white"><div className="animate-pulse">Завантаження...</div></div>;
  if (!product) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Товар не знайдено</div>;

  // Отримуємо назву поточної моделі без кольору (для заголовка)
  const cleanTitle = product.title; 

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-20">
      <Header onCartClick={() => setIsCartOpen(true)} cartCount={totalItems} onLogout={() => {}} />

      <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
        
        {/* Breadcrumbs */}
        <div className="text-xs text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-widest flex-wrap">
           <Link href="/catalog" className="hover:text-white transition">Каталог</Link> <ChevronRight size={12}/>
           <span className="text-gray-300">{product.category}</span> <ChevronRight size={12}/>
           <span className="text-white font-bold truncate max-w-[300px]">{cleanTitle}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* === ЛІВА КОЛОНКА: ФОТО + ВАРІАНТИ КОЛЬОРІВ === */}
          <div className="lg:col-span-5 space-y-6">
            {/* Головне фото */}
            <div className="bg-white rounded-2xl p-4 border border-white/5 aspect-[3/4] flex items-center justify-center relative overflow-hidden">
               <div className="w-full h-full relative">
                 <ProductImage src={activeImage} alt={product.title} fill className="object-contain"/>
               </div>
               {product.in_stock && (
                   <div className="absolute top-4 left-4 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                       В наявності
                   </div>
               )}
            </div>

            {/* Сітка інших кольорів */}
            {colorOptions.length > 1 && (
                <div>
                    <h3 className="text-sm font-bold mb-3 text-gray-400">В наявності різні кольори:</h3>
                    <div className="flex flex-wrap gap-3">
                        {colorOptions.map((opt) => (
                            <Link 
                                key={opt.id} 
                                href={`/product/${opt.id}`}
                                className={`w-14 h-16 rounded-lg overflow-hidden border-2 transition relative group 
                                    ${opt.isActive ? "border-blue-500 ring-2 ring-blue-500/20" : "border-white/10 hover:border-white/50"}`}
                                title={opt.name}
                            >
                                <ProductImage src={opt.image} alt={opt.name} fill className="object-cover"/>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
          </div>

          {/* === ПРАВА КОЛОНКА: ІНФО + ТАБЛИЦЯ РОЗМІРІВ === */}
          <div className="lg:col-span-7">
            <div className="sticky top-24 bg-[#111] p-6 lg:p-8 rounded-3xl border border-white/5">
              
              <div className="mb-6 border-b border-white/10 pb-6">
                  <h1 className="text-2xl lg:text-3xl font-black mb-2 text-white">{product.title}</h1>
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                     <span>Артикул: {product.sku}</span>
                     {product.brand && <span>Бренд: {product.brand}</span>}
                  </div>
              </div>

              {/* Ціна (якщо одна на всі розміри) */}
              {!hasRealSizes && (
                  <div className="mb-8">
                     <div className="text-4xl font-black text-white flex items-baseline gap-2">
                        {Math.ceil(product.price * 1.2)} <span className="text-lg font-medium text-gray-500">грн</span>
                     </div>
                  </div>
              )}

              {/* --- ТАБЛИЦЯ РОЗМІРІВ (СТИЛЬ TOTOBI) --- */}
              {hasRealSizes ? (
                  <div className="mb-8">
                      <div className="grid grid-cols-12 text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 mb-2">
                         <div className="col-span-4">Розмір / Ціна</div>
                         <div className="col-span-4 text-center">На складі</div>
                         <div className="col-span-4 text-right">Замовлення</div>
                      </div>

                      <div className="space-y-2">
                          {currentSizes.map((size: any, idx: number) => {
                              const avail = size.stock_available || 0;
                              const price = Math.ceil(size.price * 1.2);
                              const qty = quantities[size.label] || "";

                              return (
                                 <div key={idx} className={`grid grid-cols-12 items-center py-3 px-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition rounded-lg ${avail === 0 ? "opacity-50 grayscale" : ""}`}>
                                     
                                     {/* Розмір і Ціна */}
                                     <div className="col-span-4">
                                         <div className="font-bold text-lg text-white">{size.label}</div>
                                         <div className="text-xs text-gray-400 font-mono">{price} грн</div>
                                     </div>

                                     {/* На складі */}
                                     <div className="col-span-4 text-center">
                                          <span className={`font-bold text-lg ${avail > 0 ? "text-white" : "text-gray-600"}`}>
                                              {avail}
                                          </span>
                                     </div>

                                     {/* Input */}
                                     <div className="col-span-4 flex justify-end">
                                          {avail > 0 ? (
                                              <div className="relative w-24">
                                                  <input 
                                                      type="number" 
                                                      min="0"
                                                      max={avail}
                                                      placeholder="0"
                                                      value={qty}
                                                      onChange={(e) => {
                                                          const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                          if (val > avail) return;
                                                          if (val <= 0) {
                                                              const newQ = {...quantities};
                                                              delete newQ[size.label];
                                                              setQuantities(newQ);
                                                          } else {
                                                              setQuantities({...quantities, [size.label]: val});
                                                          }
                                                      }}
                                                      className={`w-full py-2 px-3 text-center bg-transparent border-2 rounded-xl font-bold outline-none transition
                                                          ${qty !== "" && qty > 0 
                                                              ? "border-white text-black bg-white" 
                                                              : "border-white/20 text-white focus:border-white/50 hover:border-white/40"}
                                                      `}
                                                  />
                                                  {qty !== "" && qty > 0 && <Info size={12} className="absolute top-1 right-1 text-black/50"/>}
                                              </div>
                                          ) : (
                                              <span className="text-xs text-gray-600 py-2">—</span>
                                          )}
                                     </div>
                                 </div>
                              )
                          })}
                      </div>
                  </div>
              ) : (
                  /* КУПІВЛЯ БЕЗ РОЗМІРІВ */
                  <div className="flex items-center gap-4 mb-8">
                      <div className="flex items-center bg-[#000] rounded-xl border border-white/10 h-14 w-40">
                          <button onClick={() => setSingleQuantity(p => Math.max(1, p - 1))} className="w-12 h-full text-white hover:bg-white/10 transition" disabled={totalStock <= 0}><Minus size={18} className="mx-auto"/></button>
                          <input type="number" className="flex-1 bg-transparent text-center font-bold text-xl text-white outline-none" value={singleQuantity} onChange={(e) => { const v = parseInt(e.target.value); if(v > 0) setSingleQuantity(Math.min(v, totalStock)); }} disabled={totalStock <= 0}/>
                          <button onClick={() => setSingleQuantity(p => Math.min(totalStock, p + 1))} className="w-12 h-full text-white hover:bg-white/10 transition" disabled={totalStock <= 0}><Plus size={18} className="mx-auto"/></button>
                      </div>
                  </div>
              )}

              {/* Футер картки: Підсумок і Кнопка */}
              <div className="flex items-center justify-between border-t border-white/10 pt-6 mt-4">
                    <div>
                       <p className="text-gray-500 text-[10px] font-bold uppercase mb-1 tracking-widest">Всього</p>
                       <p className="text-3xl font-black text-white">{calculateTotal()} <span className="text-lg text-gray-500 font-medium">грн</span></p>
                    </div>
                    <button 
                        onClick={handleAddToCart} 
                        disabled={calculateTotal() === 0} 
                        className="bg-white text-black hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed font-black px-8 py-4 rounded-xl flex items-center justify-center gap-3 transition shadow-lg w-1/2"
                    >
                       <ShoppingBag size={20}/> <span className="uppercase tracking-widest text-sm">У кошик</span>
                    </button>
              </div>

            </div>
          </div>
        </div>
      </main>
      
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}