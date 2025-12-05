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
  Heart, Truck, CheckCircle, ShoppingBag, 
  ChevronRight, Check, Minus, Plus, LayoutList, AlertCircle, Info
} from "lucide-react";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  
  const { addToCart, totalItems } = useCart(); 
  
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Галерея зображень
  const [gallery, setGallery] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [singleQuantity, setSingleQuantity] = useState(1);

  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [session, setSession] = useState<any>(null);

  // Для таблиці наявності (матриця знизу)
  const [allSizes, setAllSizes] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    async function fetchProductData() {
      if (!params.id) return;
      
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
      
      // Логіка галереї: якщо є масив images, беремо його.
      const imagesList = currentProduct.images && Array.isArray(currentProduct.images) && currentProduct.images.length > 0
        ? currentProduct.images 
        : [currentProduct.image_url];
      
      // Перевіряємо, чи є головне фото в списку, якщо ні - додаємо
      if (!imagesList.includes(currentProduct.image_url) && currentProduct.image_url) {
        imagesList.unshift(currentProduct.image_url);
      }

      setGallery(imagesList);
      setActiveImage(imagesList[0]);
      
      setSingleQuantity(1);
      setQuantities({});

      // Завантажуємо варіанти кольорів
      const { data: relatedProducts } = await supabase
        .from("products")
        .select("*")
        .eq("title", currentProduct.title); 

      if (relatedProducts) {
        setVariants(relatedProducts);

        const sizesSet = new Set<string>();
        relatedProducts.forEach((p: any) => {
            if (p.sizes && Array.isArray(p.sizes)) {
                p.sizes.forEach((s: any) => sizesSet.add(s.label));
            }
        });
        
        const order = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL"];
        const sortedSizes = Array.from(sizesSet).sort((a, b) => {
             return order.indexOf(a) - order.indexOf(b);
        });
        
        setAllSizes(sortedSizes.length > 0 && sortedSizes[0] !== -1 ? sortedSizes : Array.from(sizesSet));
      }
      
      setLoading(false);
    }

    fetchProductData();
  }, [params.id]);

  // --- ХЕЛПЕРИ ДЛЯ ЗАЛИШКІВ ---
  const getRealAvailable = (stock: number = 0, reserve: number = 0) => {
    return Math.max(0, stock - reserve);
  };

  const handleAddToCart = () => {
    const itemsToAdd: any[] = [];
    let hasItems = false;
    
    if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        product.sizes.forEach((sizeObj: any) => {
            const qty = quantities[sizeObj.label] || 0;
            if (qty > 0) {
                itemsToAdd.push({
                    id: product.id,
                    title: product.title,
                    image_url: product.image_url,
                    selectedSize: sizeObj.label,
                    price: Math.ceil(sizeObj.price * 1.2), 
                    quantity: qty
                });
                hasItems = true;
            }
        });
        if (!hasItems) {
            alert("Виберіть кількість хоча б для одного розміру");
            return;
        }
    } else {
        if (singleQuantity <= 0) return;
        itemsToAdd.push({ 
            id: product.id,
            title: product.title,
            image_url: product.image_url,
            price: product.price,
            quantity: singleQuantity 
        });
        hasItems = true;
    }

    itemsToAdd.forEach(item => addToCart(item));
    setIsCartOpen(true);
  };

  const calculateTotal = () => {
      if (product.sizes && product.sizes.length > 0) {
          let total = 0;
          product.sizes.forEach((s: any) => {
              const qty = quantities[s.label] || 0;
              const price = Math.ceil(s.price * 1.2);
              total += qty * price;
          });
          return total;
      }
      return (product.price || 0) * singleQuantity;
  };

  const getStockFree = (prod: any = product) => {
      if (!prod) return 0;
      if (prod.sizes && prod.sizes.length > 0) {
          return prod.sizes.reduce((acc: number, s: any) => acc + getRealAvailable(s.stock_available, s.reserve), 0);
      }
      return getRealAvailable(prod.amount, prod.reserve);
  };

  async function handleLogout() { await supabase.auth.signOut(); router.push("/"); }

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white"><div className="animate-pulse">Завантаження товару...</div></div>;
  if (!product) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Товар не знайдено</div>;

  const stockFree = getStockFree();
  const hasSizes = product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-20">
      
      {/* Header */}
      <Header 
          onCartClick={() => setIsCartOpen(true)} 
          cartCount={totalItems} 
          onLogout={handleLogout}
          onMobileMenuClick={() => {}}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* Breadcrumbs */}
        <div className="text-xs text-gray-500 mb-8 flex items-center gap-2 uppercase tracking-widest flex-wrap">
           <Link href="/" className="hover:text-white transition">Головна</Link> <ChevronRight size={12}/>
           <Link href="/catalog" className="hover:text-white transition">Каталог</Link> <ChevronRight size={12}/>
           <span className="text-white font-bold truncate max-w-[300px]">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* === ЛІВА ЧАСТИНА: ГАЛЕРЕЯ (DARK) === */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#111] rounded-2xl p-4 border border-white/5 aspect-[3/4] flex items-center justify-center relative overflow-hidden group">
               <div className="w-full h-full relative">
                 <ProductImage 
                   src={activeImage || product.image_url} 
                   alt={product.title} 
                   fill 
                   className="transition duration-500 object-contain"
                 />
               </div>
               <button className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-full hover:bg-red-500/80 transition text-white/70 hover:text-white z-10 border border-white/10">
                 <Heart size={20}/>
               </button>
            </div>

            {/* Мініатюри */}
            {gallery.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {gallery.map((img, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setActiveImage(img)}
                            className={`w-20 h-24 flex-shrink-0 bg-[#111] border rounded-lg overflow-hidden cursor-pointer transition relative ${activeImage === img ? "border-blue-500 ring-1 ring-blue-500" : "border-white/10 hover:border-white/30"}`}
                        >
                            <ProductImage src={img} alt={`View ${idx}`} fill className="object-cover opacity-80 hover:opacity-100 transition"/>
                        </div>
                    ))}
                </div>
            )}

            {/* Варіанти кольорів */}
            {variants.length > 1 && (
                <div className="bg-[#111] p-6 rounded-2xl border border-white/5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-white/5 pb-3 flex justify-between">
                        <span>Інші кольори</span>
                        <span className="text-white bg-white/10 px-2 rounded-full text-[10px] flex items-center">{variants.length}</span>
                    </h3>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                        {variants.map((v) => (
                            <Link 
                              key={v.id} 
                              href={`/product/${v.id}`} 
                              className={`aspect-square rounded-lg overflow-hidden border-2 transition relative group ${Number(product.id) === Number(v.id) ? "border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)] scale-105" : "border-white/5 hover:border-white/30"}`}
                              title={v.color || "Варіант"}
                            >
                                <ProductImage src={v.image_url} alt="Color Variant" fill />
                                {Number(product.id) === Number(v.id) && (
                                   <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center backdrop-blur-[1px]">
                                      <Check size={16} className="text-white drop-shadow-md stroke-[3]"/>
                                   </div>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
          </div>

          {/* === ПРАВА ЧАСТИНА: ІНФО ТА ЗАМОВЛЕННЯ (DARK) === */}
          <div className="lg:col-span-6">
            <div className="sticky top-24 space-y-8">
              
              <div>
                 <h1 className="text-3xl lg:text-4xl font-black mb-4 text-white leading-tight">{product.title}</h1>
                 <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <span className="bg-[#222] border border-white/10 px-3 py-1 rounded text-xs font-mono font-bold text-gray-300">Арт: {product.sku}</span>
                    {product.brand && <span className="font-medium text-gray-300 flex items-center gap-2"><span className="w-1 h-1 bg-gray-500 rounded-full"></span> {product.brand}</span>}
                 </div>
              </div>

              {/* ГОЛОВНИЙ БЛОК: ЦІНА + ТАБЛИЦЯ */}
              <div className="bg-[#111] p-6 lg:p-8 rounded-3xl border border-white/5 shadow-2xl">
                  <div className="flex justify-between items-start mb-8">
                     <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Гуртова ціна</span>
                        <div className="text-5xl font-black text-white tracking-tight flex items-baseline gap-2">
                           {product.price} <span className="text-xl font-medium text-gray-500">грн</span>
                        </div>
                     </div>
                     
                     {!hasSizes && (
                         <div className="text-right mt-2">
                            {stockFree > 0 ? (
                                  <span className="text-green-400 bg-green-900/20 px-4 py-1.5 rounded-full text-xs font-bold border border-green-500/20 flex items-center gap-2">
                                    <CheckCircle size={14}/> В наявності: {stockFree}
                                  </span>
                            ) : (
                              <span className="text-red-400 bg-red-900/20 px-4 py-1.5 rounded-full text-xs font-bold border border-red-500/20">
                                Немає в наявності
                              </span>
                            )}
                         </div>
                     )}
                  </div>

                  {/* --- СПИСОК РОЗМІРІВ (TOTOBI DARK STYLE) --- */}
                  {hasSizes && (
                      <div className="mb-8">
                          {/* Шапка */}
                          <div className="grid grid-cols-12 text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 px-4">
                             <div className="col-span-3">Розмір</div>
                             <div className="col-span-3 text-center">Склад</div>
                             <div className="col-span-3 text-center text-blue-400">Доступно</div>
                             <div className="col-span-3 text-right">Кількість</div>
                          </div>

                          {/* Список БЕЗ скролу (повна висота) */}
                          <div className="space-y-3">
                             {product.sizes.map((size: any, idx: number) => {
                                 const totalStock = size.stock_available || 0;
                                 const reserve = size.reserve || 0;
                                 const available = getRealAvailable(totalStock, reserve);
                                 const currentQty = quantities[size.label] || "";

                                 return (
                                    <div key={idx} className={`grid grid-cols-12 items-center bg-[#1a1a1a] border p-4 rounded-2xl transition duration-200 ${available > 0 ? "border-white/5 hover:border-blue-500/50 hover:bg-[#222]" : "border-white/5 opacity-40 bg-black"}`}>
                                        
                                        {/* Розмір */}
                                        <div className="col-span-3">
                                            <div className="font-black text-xl text-white">{size.label}</div>
                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{Math.ceil(size.price * 1.2)} грн</div>
                                        </div>
                                        
                                        {/* На складі */}
                                        <div className="col-span-3 text-center">
                                            <span className="text-gray-500 font-bold text-sm">{totalStock}</span>
                                        </div>

                                        {/* Доступно */}
                                        <div className="col-span-3 text-center">
                                             <span className={`font-black text-lg ${available > 0 ? "text-blue-400" : "text-gray-600"}`}>
                                                 {available}
                                             </span>
                                        </div>

                                        {/* Input (Pill Style) */}
                                        <div className="col-span-3 flex justify-end">
                                             {available > 0 ? (
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        max={available}
                                                        placeholder="0"
                                                        value={currentQty}
                                                        onChange={(e) => {
                                                            const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                            if (val > available) return;
                                                            if (val === 0) {
                                                                const newQ = {...quantities};
                                                                delete newQ[size.label];
                                                                setQuantities(newQ);
                                                            } else {
                                                                setQuantities({...quantities, [size.label]: val});
                                                            }
                                                        }}
                                                        className={`w-20 py-2 px-1 text-center bg-transparent border-2 rounded-full font-bold outline-none transition text-lg
                                                            ${currentQty !== "" && currentQty > 0 
                                                                ? "border-blue-500 text-blue-400 bg-blue-900/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                                                                : "border-white/10 text-white focus:border-blue-500/50 hover:border-white/30"}
                                                        `}
                                                    />
                                                </div>
                                             ) : (
                                                 <span className="text-[10px] text-red-400 font-bold bg-red-900/10 px-3 py-1.5 rounded-full border border-red-900/30">Немає</span>
                                             )}
                                        </div>
                                    </div>
                                 )
                             })}
                          </div>
                      </div>
                  )}

                  {/* КУПІВЛЯ (Без розмірів) */}
                  {!hasSizes && (
                      <div className="flex items-center gap-4 border-t border-white/10 pt-8">
                          <div className="flex items-center bg-[#000] rounded-xl overflow-hidden border border-white/10 h-14 w-40">
                              <button onClick={() => setSingleQuantity(prev => Math.max(1, prev - 1))} className="w-12 h-full hover:bg-white/10 transition text-white disabled:opacity-30" disabled={stockFree <= 0 || singleQuantity <= 1}><Minus size={18} className="mx-auto"/></button>
                              <input type="number" className="flex-1 bg-transparent text-center font-black text-xl text-white outline-none" value={singleQuantity} onChange={(e) => { const val = parseInt(e.target.value) || 1; setSingleQuantity(Math.min(val, stockFree)); }} disabled={stockFree <= 0} />
                              <button onClick={() => setSingleQuantity(prev => Math.min(stockFree, prev + 1))} className="w-12 h-full hover:bg-white/10 transition text-white disabled:opacity-30" disabled={stockFree <= 0 || singleQuantity >= stockFree}><Plus size={18} className="mx-auto"/></button>
                          </div>
                          
                          <button onClick={handleAddToCart} disabled={stockFree <= 0} className="flex-1 bg-white text-black hover:bg-blue-500 hover:text-white disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed font-black h-14 rounded-xl flex items-center justify-center gap-2 transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                            <ShoppingBag size={20}/> <span className="uppercase tracking-widest text-sm">Купити</span>
                          </button>
                      </div>
                  )}

                  {/* Підсумок */}
                  {hasSizes && (
                      <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-4">
                           <div>
                              <p className="text-gray-500 text-[10px] font-bold uppercase mb-1 tracking-widest">Разом до сплати</p>
                              <p className="text-3xl font-black text-white">{calculateTotal()} <span className="text-lg text-gray-500 font-medium">грн</span></p>
                           </div>
                           <button onClick={handleAddToCart} disabled={calculateTotal() === 0} className="bg-white text-black hover:bg-blue-600 hover:text-white disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed font-black px-10 py-4 rounded-xl flex items-center justify-center gap-3 transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                             <ShoppingBag size={22}/> <span className="uppercase tracking-widest text-sm">У кошик</span>
                           </button>
                      </div>
                  )}
              </div>

              {/* Інфо про доставку */}
              <div className="p-5 bg-[#1a1a00] border border-yellow-900/30 rounded-2xl flex gap-4 items-start">
                  <div className="p-2 bg-yellow-900/20 rounded-lg text-yellow-500">
                    <Truck size={24} />
                  </div>
                  <div>
                      <h4 className="text-yellow-500 font-bold text-sm mb-1 uppercase tracking-wide">Склад постачальника</h4>
                      <p className="text-yellow-200/60 text-xs leading-relaxed">
                        Відвантаження відбувається протягом 1-3 робочих днів. Залишки оновлюються автоматично в режимі реального часу.
                      </p>
                  </div>
              </div>

            </div>
          </div>

        </div>

        {/* === ВЕЛИКА МАТРИЦЯ (ДЛЯ МЕНЕДЖЕРА) === */}
        {variants.length > 0 && (
            <div className="mt-16 bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-[#161616] flex justify-between items-center">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <LayoutList size={28} className="text-blue-500"/> Загальна наявність
                    </h2>
                    <div className="text-xs font-bold text-gray-500 flex gap-6 uppercase tracking-wider">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span> Багато</span>
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span> Мало</span>
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-700"></span> Немає</span>
                    </div>
                </div>

                <div className="overflow-x-auto pb-2">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0a0a0a] text-gray-500 text-[10px] uppercase tracking-widest">
                                <th className="p-5 border-b border-white/5 font-bold w-[250px]">Колір / Артикул</th>
                                {allSizes.length > 0 ? (
                                    allSizes.map(size => (
                                        <th key={size} className="p-5 border-b border-white/5 font-bold text-center min-w-[80px]">{size}</th>
                                    ))
                                ) : (
                                    <th className="p-5 border-b border-white/5 font-bold text-center">Залишок</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {variants.map(variant => (
                                <tr key={variant.id} className={`hover:bg-white/[0.02] transition border-b border-white/5 last:border-0 ${Number(product.id) === Number(variant.id) ? "bg-blue-900/10" : ""}`}>
                                    <td className="p-5">
                                        <Link href={`/product/${variant.id}`} className="flex items-center gap-4 group">
                                            <div className="w-12 h-12 relative rounded-lg border border-white/10 overflow-hidden flex-shrink-0 group-hover:border-white/30 transition">
                                                <ProductImage src={variant.image_url} alt={variant.color} fill />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white group-hover:text-blue-400 transition">{variant.color}</div>
                                                <div className="text-[10px] text-gray-500 font-mono mt-1">{variant.sku}</div>
                                            </div>
                                        </Link>
                                    </td>
                                    
                                    {allSizes.length > 0 ? (
                                        allSizes.map(sizeLabel => {
                                            const sizeObj = variant.sizes?.find((s: any) => s.label === sizeLabel);
                                            const totalOnStock = sizeObj ? (sizeObj.stock_available || 0) : 0;
                                            const reserve = sizeObj ? (sizeObj.reserve || 0) : 0;
                                            const realAvailable = getRealAvailable(totalOnStock, reserve);

                                            return (
                                                <td key={sizeLabel} className="p-2 text-center align-middle">
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        {realAvailable > 0 ? (
                                                            <span className={`text-sm font-bold ${realAvailable < 10 ? "text-orange-500" : "text-green-500"}`}>
                                                                {realAvailable}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-700 text-lg">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })
                                    ) : (
                                        <td className="p-5 text-center">
                                            {(() => {
                                                const realAv = getRealAvailable(variant.amount, variant.reserve);
                                                return realAv > 0 ? <span className="font-bold text-green-500">{realAv} шт.</span> : <span className="text-gray-700">-</span>
                                            })()}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </main>
      
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      
    </div>
  );
}