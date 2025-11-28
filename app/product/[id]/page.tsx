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
  ArrowLeft, ShoppingBag, Heart, Share2, Truck, ShieldCheck, 
  CheckCircle, Star, Package, ChevronRight, Check, Info, AlertCircle,
  Minus, Plus, LayoutList
} from "lucide-react";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  
  const { addToCart, totalItems } = useCart(); 
  
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]); // Тут тепер будуть повні дані про всі варіанти
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [singleQuantity, setSingleQuantity] = useState(1);

  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [session, setSession] = useState<any>(null);

  // Для таблиці наявності
  const [allSizes, setAllSizes] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    async function fetchProductData() {
      if (!params.id) return;
      
      // 1. Завантажуємо поточний продукт
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
      
      setSingleQuantity(1);
      setQuantities({});

      // 2. Завантажуємо ВСІ варіанти цієї моделі (по title), щоб отримати їхні розміри та залишки для таблиці
      const { data: relatedProducts } = await supabase
        .from("products")
        .select("*") // Беремо все, включаючи sizes
        .eq("title", currentProduct.title); 

      if (relatedProducts) {
        setVariants(relatedProducts);

        // Збираємо унікальні розміри для шапки таблиці
        const sizesSet = new Set<string>();
        relatedProducts.forEach((p: any) => {
            if (p.sizes && Array.isArray(p.sizes)) {
                p.sizes.forEach((s: any) => sizesSet.add(s.label));
            }
        });
        // Сортуємо розміри (можна покращити логіку сортування, якщо треба)
        const sortedSizes = Array.from(sizesSet).sort((a, b) => {
             const order = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL"];
             return order.indexOf(a) - order.indexOf(b);
        });
        // Якщо сортування не спрацювало (нестандартні розміри), залишаємо як є
        setAllSizes(sortedSizes.length > 0 && sortedSizes[0] !== -1 ? sortedSizes : Array.from(sizesSet));
      }
      
      setLoading(false);
    }

    fetchProductData();
  }, [params.id]);

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
      // Якщо є масив sizes, сумуємо stock_available звідти, інакше беремо загальні поля
      if (prod.sizes && prod.sizes.length > 0) {
          return prod.sizes.reduce((acc: number, s: any) => acc + (s.stock_available || 0), 0);
      }
      return (prod.amount || 0) - (prod.reserve || 0);
  };

  async function handleLogout() { await supabase.auth.signOut(); router.push("/"); }

  if (loading) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Завантаження...</div>;
  if (!product) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Товар не знайдено</div>;

  const stockFree = getStockFree();
  const hasSizes = product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0;

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans pb-20">
      
      <Header 
        onCartClick={() => setIsCartOpen(true)} 
        cartCount={totalItems} 
        onLogout={handleLogout}
        onMobileMenuClick={() => {}}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* BREADCRUMBS */}
        <div className="text-xs text-gray-500 mb-8 flex items-center gap-2 uppercase tracking-widest flex-wrap">
           <Link href="/" className="hover:text-white">Головна</Link> <ChevronRight size={12}/>
           <Link href="/catalog" className="hover:text-white">Каталог</Link> <ChevronRight size={12}/>
           <span className="text-white truncate max-w-[300px]">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* === ЛІВА ЧАСТИНА === */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 aspect-[3/4] flex items-center justify-center relative overflow-hidden group">
               <div className="w-full h-full relative">
                 <ProductImage 
                   src={activeImage || product.image_url} 
                   alt={product.title} 
                   fill 
                   className="transition duration-500 group-hover:scale-105"
                 />
               </div>
               <button className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-red-500 transition text-white backdrop-blur-md z-10">
                 <Heart size={20}/>
               </button>
            </div>

            {/* Кольори */}
            {variants.length > 1 && (
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex justify-between">
                        <span>Доступні кольори</span>
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

          {/* === ПРАВА ЧАСТИНА === */}
          <div className="lg:col-span-7">
            <div className="sticky top-24">
              
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
                    <span className="flex items-center gap-2">Бренд: <span className="text-white font-bold">{product.brand || "Не вказано"}</span></span>
                 </div>
              </div>

              {/* Ціна */}
              <div className="flex justify-between items-end mb-8">
                 <div className="text-5xl font-black text-white tracking-tight">
                    {product.price} <span className="text-2xl font-medium text-gray-500">грн</span>
                 </div>
                 
                 {/* Статус наявності */}
                 {!hasSizes && (
                     <div className="text-right">
                        {stockFree > 0 ? (
                          <div className="flex flex-col items-end">
                              <span className="text-green-400 bg-green-900/20 px-4 py-1.5 rounded-full text-sm font-bold border border-green-900/30 flex items-center gap-2 mb-1">
                                <CheckCircle size={16}/> В наявності: {stockFree} шт.
                              </span>
                              <span className="text-xs text-gray-500">Готово до відправки</span>
                          </div>
                        ) : (
                          <span className="text-red-400 bg-red-900/20 px-4 py-1.5 rounded-full text-sm font-bold border border-red-900/30">
                            Немає в наявності
                          </span>
                        )}
                     </div>
                 )}
              </div>

              {/* КУПІВЛЯ */}
              {hasSizes ? (
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden mb-8 shadow-2xl">
                      <div className="grid grid-cols-4 bg-[#252525] p-4 text-xs text-gray-300 font-bold uppercase tracking-wider text-center border-b border-white/10">
                          <div className="text-left pl-2">Розмір / Ціна</div>
                          <div>Статус</div>
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
                                      <div className="flex justify-center">
                                          {available > 0 ? (
                                              <span className="text-[10px] text-green-400 font-bold bg-green-900/20 px-2 py-1 rounded border border-green-900/30">Є в наявності</span>
                                          ) : (
                                              <span className="text-[10px] text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded border border-red-900/30">Очікується</span>
                                          )}
                                      </div>
                                      <div className="text-sm font-mono text-white font-bold">
                                          {available > 0 ? available : '-'}
                                      </div>
                                      <div className="flex justify-center">
                                          <input 
                                            type="number" 
                                            min="0"
                                            max={available}
                                            placeholder="0"
                                            disabled={available === 0}
                                            className="w-20 bg-black border border-white/20 rounded-lg p-2 text-center text-white focus:border-blue-500 outline-none font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val > available) return;
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
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 mb-8 shadow-xl">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                              <span className="text-sm font-bold uppercase text-gray-400 tracking-wider">Кількість:</span>
                              <div className="flex items-center bg-black rounded-lg border border-white/20 overflow-hidden">
                                  <button onClick={() => setSingleQuantity(prev => Math.max(1, prev - 1))} className="p-3 hover:bg-white/10 transition text-white disabled:opacity-30" disabled={stockFree <= 0 || singleQuantity <= 1}><Minus size={18}/></button>
                                  <input type="number" className="w-16 bg-transparent text-center font-black text-xl text-white outline-none" value={singleQuantity} onChange={(e) => { const val = parseInt(e.target.value) || 1; setSingleQuantity(Math.min(val, stockFree)); }} disabled={stockFree <= 0} />
                                  <button onClick={() => setSingleQuantity(prev => Math.min(stockFree, prev + 1))} className="p-3 hover:bg-white/10 transition text-white disabled:opacity-30" disabled={stockFree <= 0 || singleQuantity >= stockFree}><Plus size={18}/></button>
                              </div>
                          </div>
                          <div className="flex-1 text-center md:text-right">
                              {stockFree > 0 ? (
                                  <p className="text-green-400 text-sm font-bold flex items-center justify-end gap-2"><CheckCircle size={16}/> Доступно: {stockFree} шт.</p>
                              ) : (
                                  <p className="text-red-400 text-sm font-bold flex items-center justify-end gap-2"><AlertCircle size={16}/> Закінчився</p>
                              )}
                          </div>
                      </div>
                  </div>
              )}

              {/* ПІДСУМОК */}
              <div className="bg-[#222] p-6 lg:p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl mb-8">
                  <div>
                      <p className="text-gray-400 text-xs uppercase tracking-widest mb-1 font-bold">Сума замовлення</p>
                      <div className="text-4xl font-black text-white tracking-tight">
                          {calculateTotal()} <span className="text-xl font-normal text-gray-500 ml-2">грн</span>
                      </div>
                  </div>
                  <button onClick={handleAddToCart} disabled={(hasSizes && calculateTotal() === 0) || (!hasSizes && stockFree <= 0)} className="w-full md:w-auto bg-white text-black hover:bg-blue-500 hover:text-white disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-bold px-10 py-5 rounded-xl flex items-center justify-center gap-3 transition duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]">
                    <ShoppingBag size={24}/> <span className="uppercase tracking-widest text-sm">Додати в кошик</span>
                  </button>
              </div>

              <div className="p-5 bg-[#332a00] border border-yellow-700/30 rounded-xl flex gap-4 items-start mb-12">
                  <Truck className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                  <div>
                      <h4 className="text-yellow-500 font-bold text-sm mb-1 uppercase tracking-wide">Важливо про доставку</h4>
                      <p className="text-yellow-200/70 text-xs leading-relaxed">Товар знаходиться на віддаленому складі. Відвантаження відбувається протягом 1-3 робочих днів.</p>
                  </div>
              </div>

            </div>
          </div>

        </div>

        {/* === ВЕЛИКА ТАБЛИЦЯ НАЯВНОСТІ === */}
        {variants.length > 0 && (
            <div className="mt-12 bg-white rounded-2xl p-8 text-black shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-black flex items-center gap-3">
                        <LayoutList size={32}/> Наявність
                    </h2>
                    <div className="flex gap-6 text-sm font-bold">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-black rounded-sm"></span> В наявності</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-400 rounded-sm"></span> Очікується</div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 border-b-2 border-gray-200 font-bold text-lg w-[300px]">Колір</th>
                                {allSizes.length > 0 ? (
                                    allSizes.map(size => (
                                        <th key={size} className="p-4 border-b-2 border-gray-200 font-bold text-lg text-center">{size}</th>
                                    ))
                                ) : (
                                    <th className="p-4 border-b-2 border-gray-200 font-bold text-lg text-center">Кількість</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {variants.map(variant => (
                                <tr key={variant.id} className="hover:bg-gray-50 transition border-b border-gray-100 last:border-0">
                                    <td className="p-4 flex items-center gap-4">
                                        <div className="w-12 h-12 relative rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                                            <ProductImage src={variant.image_url} alt={variant.color} fill />
                                        </div>
                                        <div>
                                            <div className="font-bold text-base">{variant.color || "Колір"}</div>
                                            <div className="text-xs text-gray-500 font-mono">{variant.sku}</div>
                                        </div>
                                    </td>
                                    {allSizes.length > 0 ? (
                                        allSizes.map(sizeLabel => {
                                            const sizeObj = variant.sizes?.find((s: any) => s.label === sizeLabel);
                                            const available = sizeObj ? sizeObj.stock_available : 0;
                                            const expected = sizeObj ? (sizeObj.reserve || 0) : 0;

                                            return (
                                                <td key={sizeLabel} className="p-4 text-center align-middle">
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <span className={`font-bold text-lg ${available > 0 ? "text-black" : "text-gray-300"}`}>
                                                            {available}
                                                        </span>
                                                        {expected > 0 && (
                                                            <span className="text-xs text-gray-400 font-medium">
                                                                +{expected}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })
                                    ) : (
                                        <td className="p-4 text-center align-middle">
                                            <div className="flex flex-col items-center justify-center h-full">
                                                {(() => {
                                                    const available = (variant.amount || 0) - (variant.reserve || 0);
                                                    const expected = variant.reserve || 0;
                                                    return (
                                                        <>
                                                            <span className={`font-bold text-lg ${available > 0 ? "text-black" : "text-gray-300"}`}>
                                                                {available > 0 ? available : '-'}
                                                            </span>
                                                            {expected > 0 && (
                                                                <span className="text-xs text-gray-400 font-medium">
                                                                    +{expected}
                                                                </span>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
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