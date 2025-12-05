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
  Minus, Plus, LayoutList, Camera
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
      
      // Логіка галереї:
      // Якщо в базі є поле 'images' (масив), використовуємо його. 
      // Якщо немає - створюємо масив з одного головного фото.
      const imagesList = currentProduct.images && Array.isArray(currentProduct.images) && currentProduct.images.length > 0
        ? currentProduct.images 
        : [currentProduct.image_url];
      
      // Додаємо головне фото на початок, якщо його там немає
      if (!imagesList.includes(currentProduct.image_url) && currentProduct.image_url) {
        imagesList.unshift(currentProduct.image_url);
      }

      setGallery(imagesList);
      setActiveImage(imagesList[0]);
      
      setSingleQuantity(1);
      setQuantities({});

      // 2. Завантажуємо ВСІ варіанти цієї моделі
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

  // Отримати "Чистий" залишок (Склад - Резерв)
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

  // Розрахунок доступного залишку для "простого" товару (без розмірів)
  const getStockFree = (prod: any = product) => {
      if (!prod) return 0;
      if (prod.sizes && prod.sizes.length > 0) {
          return prod.sizes.reduce((acc: number, s: any) => acc + getRealAvailable(s.stock_available, s.reserve), 0);
      }
      return getRealAvailable(prod.amount, prod.reserve);
  };

  async function handleLogout() { await supabase.auth.signOut(); router.push("/"); }

  if (loading) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Завантаження...</div>;
  if (!product) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">Товар не знайдено</div>;

  const stockFree = getStockFree();
  const hasSizes = product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 font-sans pb-20">
      
      {/* HEADER (Темний, як був) */}
      <div className="bg-[#111]">
        <Header 
            onCartClick={() => setIsCartOpen(true)} 
            cartCount={totalItems} 
            onLogout={handleLogout}
            onMobileMenuClick={() => {}}
        />
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* BREADCRUMBS */}
        <div className="text-xs text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-widest flex-wrap">
           <Link href="/" className="hover:text-black transition">Головна</Link> <ChevronRight size={12}/>
           <Link href="/catalog" className="hover:text-black transition">Каталог</Link> <ChevronRight size={12}/>
           <span className="text-gray-800 font-bold truncate max-w-[300px]">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* === ЛІВА ЧАСТИНА: ГАЛЕРЕЯ === */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Головне фото */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 aspect-[3/4] flex items-center justify-center relative overflow-hidden group shadow-sm">
               <div className="w-full h-full relative">
                 <ProductImage 
                   src={activeImage || product.image_url} 
                   alt={product.title} 
                   fill 
                   className="transition duration-500 object-contain"
                 />
               </div>
               <button className="absolute top-4 right-4 bg-white p-2 rounded-full hover:bg-gray-100 transition text-gray-400 hover:text-red-500 shadow-md z-10">
                 <Heart size={20}/>
               </button>
            </div>

            {/* Мініатюри (Галерея) */}
            {gallery.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {gallery.map((img, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setActiveImage(img)}
                            className={`w-20 h-24 flex-shrink-0 bg-white border rounded-lg overflow-hidden cursor-pointer transition relative ${activeImage === img ? "border-blue-600 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-400"}`}
                        >
                            <ProductImage src={img} alt={`View ${idx}`} fill className="object-cover"/>
                        </div>
                    ))}
                </div>
            )}

            {/* Варіанти кольорів */}
            {variants.length > 1 && (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex justify-between">
                        <span>Інші кольори</span>
                        <span className="text-black bg-gray-100 px-2 rounded-full text-xs flex items-center">{variants.length}</span>
                    </h3>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                        {variants.map((v) => (
                            <Link 
                              key={v.id} 
                              href={`/product/${v.id}`} 
                              className={`aspect-square rounded-lg overflow-hidden border-2 transition relative group ${Number(product.id) === Number(v.id) ? "border-blue-600 shadow-md scale-105" : "border-gray-100 hover:border-gray-300"}`}
                              title={v.color || "Варіант"}
                            >
                                <ProductImage src={v.image_url} alt="Color Variant" fill />
                                {Number(product.id) === Number(v.id) && (
                                   <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                                      <Check size={16} className="text-white drop-shadow-md stroke-[3]"/>
                                   </div>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
          </div>

          {/* === ПРАВА ЧАСТИНА: ІНФО === */}
          <div className="lg:col-span-6">
            <div className="sticky top-24 space-y-8">
              
              <div>
                 <h1 className="text-3xl lg:text-4xl font-black mb-3 text-gray-900 leading-tight">{product.title}</h1>
                 <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-bold text-gray-700">Арт: {product.sku}</span>
                    {product.brand && <span className="font-medium text-gray-700">Бренд: {product.brand}</span>}
                    {product.color && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400"></span> {product.color}</span>}
                 </div>
              </div>

              {/* Ціна і Статус */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                     <div className="flex flex-col">
                        <span className="text-gray-400 text-xs font-bold uppercase">Ціна за шт.</span>
                        <div className="text-4xl font-black text-gray-900 tracking-tight">
                           {product.price} <span className="text-xl font-medium text-gray-400">грн</span>
                        </div>
                     </div>
                     
                     {/* Статус наявності (Загальний) */}
                     {!hasSizes && (
                         <div className="text-right">
                            {stockFree > 0 ? (
                              <div className="flex flex-col items-end">
                                  <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-bold border border-green-100 flex items-center gap-2 mb-1">
                                    <CheckCircle size={16}/> В наявності: {stockFree}
                                  </span>
                              </div>
                            ) : (
                              <span className="text-red-500 bg-red-50 px-3 py-1 rounded-full text-sm font-bold border border-red-100">
                                Немає в наявності
                              </span>
                            )}
                         </div>
                     )}
                  </div>

                  {/* КУПІВЛЯ */}
                  {!hasSizes && (
                      <div className="flex items-center gap-4 border-t border-gray-100 pt-6">
                          {/* Лічильник */}
                          <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden border border-gray-200 h-12">
                              <button onClick={() => setSingleQuantity(prev => Math.max(1, prev - 1))} className="w-10 h-full hover:bg-gray-200 transition text-gray-600 disabled:opacity-30" disabled={stockFree <= 0 || singleQuantity <= 1}><Minus size={16} className="mx-auto"/></button>
                              <input type="number" className="w-14 bg-transparent text-center font-bold text-lg text-gray-900 outline-none" value={singleQuantity} onChange={(e) => { const val = parseInt(e.target.value) || 1; setSingleQuantity(Math.min(val, stockFree)); }} disabled={stockFree <= 0} />
                              <button onClick={() => setSingleQuantity(prev => Math.min(stockFree, prev + 1))} className="w-10 h-full hover:bg-gray-200 transition text-gray-600 disabled:opacity-30" disabled={stockFree <= 0 || singleQuantity >= stockFree}><Plus size={16} className="mx-auto"/></button>
                          </div>
                          
                          {/* Кнопка */}
                          <button onClick={handleAddToCart} disabled={stockFree <= 0} className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed font-bold h-12 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-200">
                            <ShoppingBag size={20}/> Купити
                          </button>
                      </div>
                  )}

                  {/* Підсумок для розмірної сітки */}
                  {hasSizes && (
                      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                           <div>
                              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Разом до сплати</p>
                              <p className="text-2xl font-black text-gray-900">{calculateTotal()} грн</p>
                           </div>
                           <button onClick={handleAddToCart} disabled={calculateTotal() === 0} className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-200">
                             <ShoppingBag size={20}/> У кошик
                           </button>
                      </div>
                  )}
              </div>

              {/* Інфо про доставку */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-3 items-start">
                  <Truck className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                      <h4 className="text-yellow-800 font-bold text-sm mb-1">Склад постачальника</h4>
                      <p className="text-yellow-700 text-xs leading-relaxed">
                        Відвантаження відбувається протягом 1-3 робочих днів. Залишки оновлюються автоматично.
                      </p>
                  </div>
              </div>

            </div>
          </div>

        </div>

        {/* === ВЕЛИКА ТАБЛИЦЯ НАЯВНОСТІ (МАТРИЦЯ) === */}
        {variants.length > 0 && (
            <div className="mt-12 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <LayoutList size={24} className="text-blue-600"/> Наявність по складах
                    </h2>
                    <div className="text-xs font-medium text-gray-500 flex gap-4">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Є багато</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Закінчується</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Немає</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider">
                                <th className="p-4 border-b font-bold w-[200px]">Колір / Артикул</th>
                                {allSizes.length > 0 ? (
                                    allSizes.map(size => (
                                        <th key={size} className="p-4 border-b font-bold text-center min-w-[80px]">{size}</th>
                                    ))
                                ) : (
                                    <th className="p-4 border-b font-bold text-center">Залишок</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {variants.map(variant => (
                                <tr key={variant.id} className={`hover:bg-blue-50 transition border-b border-gray-100 last:border-0 ${Number(product.id) === Number(variant.id) ? "bg-blue-50/50" : ""}`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 relative rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                                <ProductImage src={variant.image_url} alt={variant.color} fill />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{variant.color}</div>
                                                <div className="text-xs text-gray-400 font-mono">{variant.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    {allSizes.length > 0 ? (
                                        allSizes.map(sizeLabel => {
                                            const sizeObj = variant.sizes?.find((s: any) => s.label === sizeLabel);
                                            
                                            // 🔥 ГОЛОВНА ЛОГІКА: ДОСТУПНО = СКЛАД - РЕЗЕРВ
                                            const totalOnStock = sizeObj ? (sizeObj.stock_available || 0) : 0;
                                            const reserve = sizeObj ? (sizeObj.reserve || 0) : 0;
                                            const realAvailable = getRealAvailable(totalOnStock, reserve);

                                            // Поточна вибрана кількість у input
                                            const currentQty = variant.id === product.id ? (quantities[sizeLabel] || "") : "";

                                            return (
                                                <td key={sizeLabel} className="p-2 text-center align-middle">
                                                    <div className="flex flex-col items-center justify-center h-full min-h-[60px]">
                                                        {realAvailable > 0 ? (
                                                            <>
                                                                <span className={`text-sm font-bold mb-1 ${realAvailable < 10 ? "text-orange-500" : "text-green-600"}`}>
                                                                    {realAvailable}
                                                                </span>
                                                                {/* Якщо це поточний товар, показуємо інпут */}
                                                                {Number(variant.id) === Number(product.id) && (
                                                                    <input 
                                                                        type="number" 
                                                                        min="0"
                                                                        max={realAvailable}
                                                                        placeholder="0"
                                                                        value={currentQty}
                                                                        className="w-12 h-8 text-center border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition"
                                                                        onChange={(e) => {
                                                                            const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                                            if (val > realAvailable) return;
                                                                            setQuantities({...quantities, [sizeLabel]: val});
                                                                        }}
                                                                    />
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-300 text-lg">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })
                                    ) : (
                                        <td className="p-4 text-center">
                                            {/* Для товарів без розмірів */}
                                            {(() => {
                                                const realAv = getRealAvailable(variant.amount, variant.reserve);
                                                return realAv > 0 ? <span className="font-bold text-green-600">{realAv} шт.</span> : <span className="text-gray-400">-</span>
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