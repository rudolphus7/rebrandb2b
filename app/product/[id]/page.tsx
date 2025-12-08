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
  
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  
  // Всі варіанти (всі кольори/товари цієї моделі)
  const [allVariants, setAllVariants] = useState<any[]>([]);
  
  // Вибір користувача
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [activeImage, setActiveImage] = useState<string>("");
  
  // Для введення кількості
  const [quantities, setQuantities] = useState<{[key: string]: number}>({}); // { "L": 5, "XL": 2 }
  const [singleQuantity, setSingleQuantity] = useState(1); // Для товарів без розмірів

  const [isCartOpen, setIsCartOpen] = useState(false); 

  // --- 1. ЗАВАНТАЖЕННЯ ДАНИХ ---
  useEffect(() => {
    async function fetchProductData() {
      if (!params.id) return;
      setLoading(true);
      
      // 1. Вантажимо поточний товар за ID
      const { data: currentProduct, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !currentProduct) {
        setLoading(false);
        return;
      }

      // 2. Визначаємо базовий SKU (артикул до крапки або дефісу)
      // Наприклад: "5102.10" -> "5102"
      const baseSku = currentProduct.sku 
          ? currentProduct.sku.split(/[.\-_]/)[0] 
          : null;

      let siblings: any[] = [currentProduct];

      // 3. Якщо є SKU, шукаємо всіх "братів" (інші кольори)
      if (baseSku && baseSku.length > 2) {
         const { data: foundSiblings } = await supabase
            .from('products')
            .select('*')
            .ilike('sku', `${baseSku}%`); // Шукаємо все, що починається з 5102...
         
         if (foundSiblings && foundSiblings.length > 0) {
            siblings = foundSiblings;
         }
      }

      setProduct(currentProduct);
      setAllVariants(siblings);

      // 4. Встановлюємо початковий колір
      // Логіка: Якщо в товарі є sizes з кольором -> беремо перший. 
      // Якщо ні -> беремо поле color самого товару.
      let initColor = currentProduct.color;
      if (!initColor && currentProduct.sizes?.length > 0) {
          // Шукаємо перший валідний колір в розмірах
          const firstSizeWithColor = currentProduct.sizes.find((s: any) => s.color);
          if (firstSizeWithColor) initColor = firstSizeWithColor.color;
      }
      
      const startColor = initColor || "Standard";
      setSelectedColor(startColor);
      setActiveImage(currentProduct.image_url);
      
      setLoading(false);
    }

    fetchProductData();
  }, [params.id]);


  // --- 2. ОБЧИСЛЕННЯ (МЕМОЇЗАЦІЯ ДАНИХ) ---

  // А. Збираємо всі унікальні кольори з усіх варіантів
  // Повертає масив об'єктів: { name: "Red", image: "url", productId: 123 }
  const uniqueColors = (() => {
      const map = new Map();

      allVariants.forEach(p => {
          // Варіант 1: Колір записаний в корені (Totobi style)
          if (p.color) {
              if (!map.has(p.color)) {
                  map.set(p.color, { name: p.color, image: p.image_url, id: p.id });
              }
          }
          // Варіант 2: Кольори записані в масиві sizes (TopTime style)
          if (p.sizes && Array.isArray(p.sizes)) {
              p.sizes.forEach((s: any) => {
                  if (s.color && !map.has(s.color)) {
                      // Якщо це TopTime, image може бути тим самим, але ми беремо його
                      map.set(s.color, { name: s.color, image: p.image_url, id: p.id });
                  }
              });
          }
      });
      
      // Якщо кольорів не знайдено, повертаємо порожній масив (товар без кольорів)
      if (map.size === 0 && allVariants.length > 0) return [];

      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();


  // Б. Отримуємо розміри ТІЛЬКИ для ОБРАНОГО кольору
  // Це ключовий момент фільтрації списку
  const currentSizes = (() => {
      let sizes: any[] = [];

      allVariants.forEach(p => {
          // Перевірка 1: Чи сам товар відповідає кольору?
          if (p.color === selectedColor && p.sizes) {
             sizes = [...sizes, ...p.sizes];
          }
          // Перевірка 2: Чи є в товарі розміри цього кольору?
          else if (p.sizes) {
             const matchingSizes = p.sizes.filter((s: any) => s.color === selectedColor);
             sizes = [...sizes, ...matchingSizes];
          }
      });

      // Видаляємо дублікати розмірів (якщо раптом є)
      const uniqueSizes = new Map();
      sizes.forEach(s => {
          if (!uniqueSizes.has(s.label)) uniqueSizes.set(s.label, s);
      });

      // Сортуємо розміри (XXS -> XXL)
      const order = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "4XL", "ONE SIZE"];
      return Array.from(uniqueSizes.values()).sort((a: any, b: any) => {
          return order.indexOf(a.label) - order.indexOf(b.label);
      });
  })();


  // В. Загальний доступний залишок для поточного вибору
  const stockFree = currentSizes.length > 0 
      ? currentSizes.reduce((acc, s) => acc + Math.max(0, (s.stock_available || 0) - (s.reserve || 0)), 0)
      : Math.max(0, (product?.amount || 0) - (product?.reserve || 0));


  // --- ХЕЛПЕРИ ---
  
  const handleColorChange = (colorObj: any) => {
      setSelectedColor(colorObj.name);
      setActiveImage(colorObj.image);
      setQuantities({}); // Скидаємо введені кількості при зміні кольору
      setSingleQuantity(1);
      
      // Опціонально: Змінюємо URL без перезавантаження, якщо це фізично інший товар
      // if (Number(product.id) !== Number(colorObj.id)) {
      //    router.replace(`/product/${colorObj.id}`, { scroll: false });
      //    // Ми повинні оновити і product state, але тут ми працюємо в контексті "групи"
      // }
  };

  const handleAddToCart = () => {
    const itemsToAdd: any[] = [];
    
    // Сценарій 1: Товар з розмірами
    if (currentSizes.length > 0) {
        let hasItems = false;
        currentSizes.forEach((sizeObj: any) => {
            const qty = quantities[sizeObj.label] || 0;
            if (qty > 0) {
                itemsToAdd.push({
                    id: product.id, // Використовуємо ID головного товару (або можна colorObj.id)
                    title: `${product.title} (${selectedColor})`,
                    image_url: activeImage,
                    selectedSize: sizeObj.label,
                    price: Math.ceil(sizeObj.price * 1.2), // Націнка
                    quantity: qty
                });
                hasItems = true;
            }
        });

        if (!hasItems) {
            alert("Виберіть кількість хоча б для одного розміру");
            return;
        }
    } 
    // Сценарій 2: Товар без розмірів (просто штуки)
    else {
        if (singleQuantity <= 0) return;
        itemsToAdd.push({ 
            id: product.id,
            title: selectedColor !== "Standard" ? `${product.title} (${selectedColor})` : product.title,
            image_url: activeImage,
            price: product.price,
            quantity: singleQuantity 
        });
    }

    itemsToAdd.forEach(item => addToCart(item));
    setIsCartOpen(true);
    setQuantities({});
  };

  const calculateTotal = () => {
      let total = 0;
      if (currentSizes.length > 0) {
          currentSizes.forEach((s: any) => {
              const qty = quantities[s.label] || 0;
              const price = Math.ceil(s.price * 1.2);
              total += qty * price;
          });
      } else {
          total = (product.price || 0) * singleQuantity;
      }
      return total;
  };

  async function handleLogout() { await supabase.auth.signOut(); router.push("/"); }


  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white"><div className="animate-pulse">Завантаження товару...</div></div>;
  if (!product) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Товар не знайдено</div>;

  const hasSizes = currentSizes.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-20">
      
      {/* Header */}
      <Header 
          onCartClick={() => setIsCartOpen(true)} 
          cartCount={totalItems} 
          onLogout={handleLogout}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* Breadcrumbs */}
        <div className="text-xs text-gray-500 mb-8 flex items-center gap-2 uppercase tracking-widest flex-wrap">
           <Link href="/" className="hover:text-white transition">Головна</Link> <ChevronRight size={12}/>
           <Link href="/catalog" className="hover:text-white transition">Каталог</Link> <ChevronRight size={12}/>
           <span className="text-white font-bold truncate max-w-[300px]">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* === ЛІВА ЧАСТИНА: ГАЛЕРЕЯ === */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#111] rounded-2xl p-4 border border-white/5 aspect-[3/4] flex items-center justify-center relative overflow-hidden group">
               <div className="w-full h-full relative">
                 <ProductImage 
                   src={activeImage} 
                   alt={product.title} 
                   fill 
                   className="transition duration-500 object-contain"
                 />
               </div>
               {/* Badges */}
               <div className="absolute top-4 left-4 flex flex-col gap-2">
                   {stockFree > 0 ? (
                       <div className="bg-green-500/90 backdrop-blur text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                           <CheckCircle size={12}/> В наявності
                       </div>
                   ) : (
                       <div className="bg-red-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
                           Немає в наявності
                       </div>
                   )}
               </div>
            </div>
            
            {/* Додаткова галерея (якщо є в товарі) */}
            {product.images && product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {product.images.map((img: string, idx: number) => (
                        <div key={idx} onClick={() => setActiveImage(img)} className={`w-20 h-24 flex-shrink-0 bg-[#111] border rounded-lg overflow-hidden cursor-pointer ${activeImage === img ? "border-blue-500" : "border-white/10"}`}>
                            <ProductImage src={img} alt="thumb" fill className="object-cover"/>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* === ПРАВА ЧАСТИНА: ІНФО ТА ЗАМОВЛЕННЯ === */}
          <div className="lg:col-span-6">
            <div className="sticky top-24 space-y-8">
              
              <div>
                  <h1 className="text-3xl lg:text-4xl font-black mb-4 text-white leading-tight">{product.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                     <span className="bg-[#222] border border-white/10 px-3 py-1 rounded text-xs font-mono font-bold text-gray-300">Арт: {product.sku}</span>
                     {product.brand && <span className="font-medium text-gray-300 flex items-center gap-2"><span className="w-1 h-1 bg-gray-500 rounded-full"></span> {product.brand}</span>}
                  </div>
              </div>

              <div className="bg-[#111] p-6 lg:p-8 rounded-3xl border border-white/5 shadow-2xl">
                  
                  {/* Ціна */}
                  <div className="mb-8">
                     <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 block">Гуртова ціна</span>
                     <div className="text-5xl font-black text-white tracking-tight flex items-baseline gap-2">
                        {product.price} <span className="text-xl font-medium text-gray-500">грн</span>
                     </div>
                  </div>

                  {/* --- 1. ВИБІР КОЛЬОРУ --- */}
                  {uniqueColors.length > 0 && (
                      <div className="mb-8">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex justify-between">
                              <span>Обраний колір: <span className="text-white ml-1">{selectedColor}</span></span>
                          </h3>
                          <div className="flex flex-wrap gap-3">
                              {uniqueColors.map((c: any) => (
                                  <button 
                                      key={c.name}
                                      onClick={() => handleColorChange(c)}
                                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition relative group 
                                          ${selectedColor === c.name ? "border-blue-500 scale-110 shadow-[0_0_10px_rgba(37,99,235,0.5)]" : "border-white/10 hover:border-white/50"}`}
                                      title={c.name}
                                  >
                                      <ProductImage src={c.image} alt={c.name} fill className="object-cover"/>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* --- 2. СПИСОК РОЗМІРІВ (ФІЛЬТРОВАНИЙ ПО КОЛЬОРУ) --- */}
                  {hasSizes ? (
                      <div className="mb-8 space-y-3">
                          <div className="grid grid-cols-12 text-[10px] text-gray-500 font-bold uppercase tracking-widest px-4">
                             <div className="col-span-3">Розмір</div>
                             <div className="col-span-3 text-center">Ціна (шт)</div>
                             <div className="col-span-3 text-center text-blue-400">Наявність</div>
                             <div className="col-span-3 text-right">Кількість</div>
                          </div>

                          {currentSizes.map((size: any, idx: number) => {
                              const available = Math.max(0, (size.stock_available || 0) - (size.reserve || 0));
                              const currentQty = quantities[size.label] || "";
                              const displayPrice = Math.ceil(size.price * 1.2);

                              return (
                                 <div key={idx} className={`grid grid-cols-12 items-center bg-[#1a1a1a] border p-4 rounded-2xl transition duration-200 ${available > 0 ? "border-white/5 hover:border-blue-500/50 hover:bg-[#222]" : "border-white/5 opacity-40 bg-black"}`}>
                                     
                                     {/* Розмір */}
                                     <div className="col-span-3">
                                         <div className="font-black text-xl text-white">{size.label}</div>
                                     </div>
                                     
                                     {/* Ціна */}
                                     <div className="col-span-3 text-center text-xs font-mono text-gray-400">
                                         {displayPrice} грн
                                     </div>

                                     {/* Наявність */}
                                     <div className="col-span-3 text-center">
                                          <span className={`font-black text-lg ${available > 0 ? "text-blue-400" : "text-gray-600"}`}>
                                              {available}
                                          </span>
                                     </div>

                                     {/* Input */}
                                     <div className="col-span-3 flex justify-end">
                                          {available > 0 ? (
                                              <input 
                                                  type="number" 
                                                  min="0"
                                                  max={available}
                                                  placeholder="0"
                                                  value={currentQty}
                                                  onChange={(e) => {
                                                      const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                      if (val > available) return;
                                                      if (val <= 0) {
                                                          const newQ = {...quantities};
                                                          delete newQ[size.label];
                                                          setQuantities(newQ);
                                                      } else {
                                                          setQuantities({...quantities, [size.label]: val});
                                                      }
                                                  }}
                                                  className={`w-20 py-2 px-1 text-center bg-transparent border-2 rounded-full font-bold outline-none transition text-lg
                                                      ${currentQty !== "" && currentQty > 0 
                                                          ? "border-blue-500 text-blue-400 bg-blue-900/10" 
                                                          : "border-white/10 text-white focus:border-blue-500/50 hover:border-white/30"}
                                                  `}
                                              />
                                          ) : (
                                              <span className="text-[10px] text-red-400 font-bold bg-red-900/10 px-3 py-1.5 rounded-full">Немає</span>
                                          )}
                                     </div>
                                 </div>
                              )
                          })}
                      </div>
                  ) : (
                      /* КУПІВЛЯ БЕЗ РОЗМІРІВ */
                      <div className="flex items-center gap-4 border-t border-white/10 pt-8 mb-8">
                          <div className="flex items-center bg-[#000] rounded-xl overflow-hidden border border-white/10 h-14 w-40">
                              <button onClick={() => setSingleQuantity(prev => Math.max(1, prev - 1))} className="w-12 h-full hover:bg-white/10 transition text-white" disabled={stockFree <= 0 || singleQuantity <= 1}><Minus size={18} className="mx-auto"/></button>
                              <input type="number" className="flex-1 bg-transparent text-center font-black text-xl text-white outline-none" value={singleQuantity} onChange={(e) => { const val = parseInt(e.target.value) || 1; setSingleQuantity(Math.min(val, stockFree)); }} disabled={stockFree <= 0} />
                              <button onClick={() => setSingleQuantity(prev => Math.min(stockFree, prev + 1))} className="w-12 h-full hover:bg-white/10 transition text-white" disabled={stockFree <= 0 || singleQuantity >= stockFree}><Plus size={18} className="mx-auto"/></button>
                          </div>
                      </div>
                  )}

                  {/* Підсумок */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-8">
                        <div>
                           <p className="text-gray-500 text-[10px] font-bold uppercase mb-1 tracking-widest">Разом до сплати</p>
                           <p className="text-3xl font-black text-white">{calculateTotal()} <span className="text-lg text-gray-500 font-medium">грн</span></p>
                        </div>
                        <button onClick={handleAddToCart} disabled={calculateTotal() === 0} className="bg-white text-black hover:bg-blue-600 hover:text-white disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed font-black px-10 py-4 rounded-xl flex items-center justify-center gap-3 transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                           <ShoppingBag size={22}/> <span className="uppercase tracking-widest text-sm">У кошик</span>
                        </button>
                  </div>
              </div>
            </div>
          </div>

        </div>

        {/* === ВЕЛИКА МАТРИЦЯ НАЯВНОСТІ (Для менеджера) === */}
        {allVariants.length > 0 && (
            <div className="mt-16 bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-[#161616] flex justify-between items-center">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <LayoutList size={28} className="text-blue-500"/> Загальна наявність
                    </h2>
                </div>

                <div className="overflow-x-auto pb-2">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0a0a0a] text-gray-500 text-[10px] uppercase tracking-widest">
                                <th className="p-5 border-b border-white/5 font-bold">Колір</th>
                                <th className="p-5 border-b border-white/5 font-bold">Артикул</th>
                                {/* Динамічні колонки розмірів або "Залишок" */}
                                {hasSizes ? (
                                    currentSizes.map((s: any) => s.label).filter((v, i, a) => a.indexOf(v) === i).sort().map((sizeLabel: string) => (
                                        <th key={sizeLabel} className="p-5 border-b border-white/5 font-bold text-center">{sizeLabel}</th>
                                    ))
                                ) : (
                                    <th className="p-5 border-b border-white/5 font-bold text-center">Залишок</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {/* Ми групуємо рядки по кольору. Для Totobi кожен варіант - це рядок. Для TopTime - один рядок з багатьма розмірами. */}
                            {allVariants.map(variant => {
                                // Якщо це TopTime і в ньому багато кольорів в sizes, треба розбити на рядки. 
                                // АЛЕ, ми зробили allVariants як список "товарів". 
                                // Якщо route.ts згрупував все в один товар, то allVariants.length = 1.
                                // Тоді нам треба ітерувати по унікальних кольорах всередині цього товару.
                                
                                // Логіка для виведення рядків таблиці:
                                const variantColors = variant.sizes 
                                    ? [...new Set(variant.sizes.map((s: any) => s.color).filter(Boolean))] 
                                    : [variant.color];

                                if (variantColors.length === 0) variantColors.push("Standard");

                                return variantColors.map((vColor: any, vIdx: number) => {
                                    // Фільтруємо розміри для цього конкретного рядка (кольору)
                                    const rowSizes = variant.sizes ? variant.sizes.filter((s: any) => s.color === vColor) : [];
                                    const rowTotal = rowSizes.length > 0 
                                        ? rowSizes.reduce((a: any, b: any) => a + (b.stock_available || 0), 0)
                                        : (variant.amount || 0);

                                    return (
                                        <tr key={`${variant.id}-${vColor}`} className={`hover:bg-white/[0.02] transition border-b border-white/5 ${selectedColor === vColor ? "bg-blue-900/10" : ""}`}>
                                            <td className="p-5 flex items-center gap-3">
                                                <div className="w-8 h-8 relative rounded overflow-hidden border border-white/10">
                                                    <ProductImage src={variant.image_url} alt={vColor} fill />
                                                </div>
                                                <span className="font-bold">{vColor}</span>
                                            </td>
                                            <td className="p-5 font-mono text-gray-500">{variant.sku}</td>
                                            
                                            {hasSizes ? (
                                                currentSizes.map((s: any) => s.label).filter((v:any, i:any, a:any) => a.indexOf(v) === i).sort().map((headerSize: string) => {
                                                    const matchingSize = rowSizes.find((s: any) => s.label === headerSize);
                                                    const qty = matchingSize ? (matchingSize.stock_available || 0) : 0;
                                                    return (
                                                        <td key={headerSize} className="p-5 text-center">
                                                            {qty > 0 ? <span className="text-green-500 font-bold">{qty}</span> : <span className="text-gray-700">-</span>}
                                                        </td>
                                                    )
                                                })
                                            ) : (
                                                <td className="p-5 text-center font-bold text-green-500">{rowTotal}</td>
                                            )}
                                        </tr>
                                    )
                                })
                            })}
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