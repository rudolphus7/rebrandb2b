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
  CheckCircle, ShoppingBag, ChevronRight, Minus, Plus, LayoutList
} from "lucide-react";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, totalItems } = useCart(); 
  
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  
  // Вибір користувача
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [activeImage, setActiveImage] = useState<string>("");
  
  // Кількість для кожного розміру
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [singleQuantity, setSingleQuantity] = useState(1);

  const [isCartOpen, setIsCartOpen] = useState(false); 

  useEffect(() => {
    async function fetchProduct() {
      // 1. Шукаємо за external_id (RBR-...), бо посилання в каталозі ведуть сюди
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("external_id", params.id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setProduct(data);
      
      // Ініціалізація першого кольору
      if (data.variants && data.variants.length > 0) {
          const first = data.variants[0];
          setSelectedColor(first.color);
          setActiveImage(first.image);
      } else {
          setActiveImage(data.image_url);
      }
      setLoading(false);
    }
    if (params.id) fetchProduct();
  }, [params.id]);

  // --- ОБЧИСЛЕННЯ ---

  // Унікальні кольори (для кружечків)
  const colors = product?.variants?.map((v: any) => ({
      name: v.color,
      image: v.image
  })) || [];

  // Розміри для ОБРАНОГО кольору
  const currentVariant = product?.variants?.find((v: any) => v.color === selectedColor);
  const currentSizes = currentVariant?.sizes || [];

  // Загальний залишок
  const totalStock = currentSizes.reduce((acc: number, s: any) => acc + (s.stock_available || 0), 0);

  // --- HANDLERS ---

  const handleColorChange = (colorName: string, img: string) => {
      setSelectedColor(colorName);
      setActiveImage(img);
      setQuantities({});
      setSingleQuantity(1);
  };

  const handleAddToCart = () => {
      const itemsToAdd: any[] = [];
      
      // Логіка з розмірами
      if (currentSizes.length > 0 && currentSizes[0].label !== "ONE SIZE") {
          let hasItems = false;
          currentSizes.forEach((s: any) => {
              const qty = quantities[s.label] || 0;
              if (qty > 0) {
                  itemsToAdd.push({
                      id: product.id,
                      title: `${product.title} (${selectedColor})`,
                      image_url: activeImage,
                      selectedSize: s.label,
                      price: Math.ceil(s.price * 1.2),
                      quantity: qty
                  });
                  hasItems = true;
              }
          });
          if (!hasItems) { alert("Оберіть кількість"); return; }
      } 
      // Логіка без розмірів (або ONE SIZE)
      else {
          if (singleQuantity <= 0) return;
          const price = currentSizes[0]?.price || product.price;
          itemsToAdd.push({
              id: product.id,
              title: `${product.title} (${selectedColor})`,
              image_url: activeImage,
              selectedSize: "ONE SIZE",
              price: Math.ceil(price * 1.2),
              quantity: singleQuantity
          });
      }

      itemsToAdd.forEach(i => addToCart(i));
      setIsCartOpen(true);
      setQuantities({});
  };

  const calculateTotal = () => {
      if (currentSizes.length > 0 && currentSizes[0].label !== "ONE SIZE") {
          return currentSizes.reduce((acc: number, s: any) => {
              const qty = quantities[s.label] || 0;
              return acc + (qty * Math.ceil(s.price * 1.2));
          }, 0);
      }
      const price = currentSizes[0]?.price || product.price || 0;
      return singleQuantity * Math.ceil(price * 1.2);
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Завантаження...</div>;
  if (!product) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Товар не знайдено (ID: {params.id})</div>;

  const hasRealSizes = currentSizes.length > 0 && currentSizes[0].label !== "ONE SIZE";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-20">
      <Header onCartClick={() => setIsCartOpen(true)} cartCount={totalItems} onLogout={() => {}} />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* Breadcrumbs */}
        <div className="text-xs text-gray-500 mb-8 flex items-center gap-2 uppercase tracking-widest flex-wrap">
           <Link href="/catalog" className="hover:text-white transition">Каталог</Link> <ChevronRight size={12}/>
           <span className="text-white font-bold truncate max-w-[300px]">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* GALLERY */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#111] rounded-2xl p-4 border border-white/5 aspect-[3/4] flex items-center justify-center relative overflow-hidden">
               <div className="w-full h-full relative">
                 <ProductImage src={activeImage} alt={product.title} fill className="object-contain"/>
               </div>
               {product.in_stock && (
                   <div className="absolute top-4 left-4 bg-green-500/90 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                       <CheckCircle size={12}/> В наявності
                   </div>
               )}
            </div>
          </div>

          {/* INFO */}
          <div className="lg:col-span-6">
            <div className="sticky top-24 space-y-8">
              <div>
                  <h1 className="text-3xl lg:text-4xl font-black mb-4 text-white leading-tight">{product.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                     <span className="bg-[#222] border border-white/10 px-3 py-1 rounded text-xs font-mono font-bold">Арт: {product.sku}</span>
                     {product.brand && <span className="font-medium">{product.brand}</span>}
                  </div>
              </div>

              <div className="bg-[#111] p-6 lg:p-8 rounded-3xl border border-white/5 shadow-2xl">
                  {/* Color Selector */}
                  {colors.length > 0 && (
                      <div className="mb-8">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Колір: <span className="text-white ml-1">{selectedColor}</span></h3>
                          <div className="flex flex-wrap gap-3">
                              {colors.map((c: any) => (
                                  <button key={c.name} onClick={() => handleColorChange(c.name, c.image)}
                                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition relative ${selectedColor === c.name ? "border-blue-500 scale-110" : "border-white/10 hover:border-white/50"}`}>
                                      <ProductImage src={c.image} alt={c.name} fill className="object-cover"/>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Sizes / Buy */}
                  {hasRealSizes ? (
                      <div className="mb-8 space-y-3">
                          {currentSizes.map((size: any, idx: number) => {
                              const avail = size.stock_available || 0;
                              const price = Math.ceil(size.price * 1.2);
                              const qty = quantities[size.label] || "";
                              return (
                                 <div key={idx} className={`grid grid-cols-12 items-center bg-[#1a1a1a] border p-3 rounded-xl transition ${avail > 0 ? "border-white/10" : "border-white/5 opacity-50"}`}>
                                     <div className="col-span-3 font-bold text-lg">{size.label}</div>
                                     <div className="col-span-3 text-center text-xs text-gray-400">{price} грн</div>
                                     <div className="col-span-3 text-center font-bold text-blue-400">{avail} шт</div>
                                     <div className="col-span-3 flex justify-end">
                                          {avail > 0 ? (
                                              <input type="number" min="0" max={avail} value={qty} placeholder="0"
                                                  onChange={(e) => {
                                                      const v = parseInt(e.target.value) || 0;
                                                      if (v <= avail) setQuantities({...quantities, [size.label]: v > 0 ? v : 0});
                                                  }}
                                                  className="w-16 py-1 px-1 text-center bg-transparent border rounded-lg font-bold outline-none text-white border-white/20 focus:border-blue-500"
                                              />
                                          ) : <span className="text-xs text-red-500">Немає</span>}
                                     </div>
                                 </div>
                              )
                          })}
                      </div>
                  ) : (
                      <div className="flex items-center gap-4 border-t border-white/10 pt-8 mb-8">
                          <div className="flex items-center bg-[#000] rounded-xl border border-white/10 h-12 w-32">
                              <button onClick={() => setSingleQuantity(p => Math.max(1, p - 1))} className="w-10 h-full text-white"><Minus size={16} className="mx-auto"/></button>
                              <input type="number" className="flex-1 bg-transparent text-center font-bold text-white outline-none" value={singleQuantity} readOnly />
                              <button onClick={() => setSingleQuantity(p => Math.min(totalStock, p + 1))} className="w-10 h-full text-white"><Plus size={16} className="mx-auto"/></button>
                          </div>
                      </div>
                  )}

                  <div className="flex items-center justify-between border-t border-white/10 pt-6">
                        <div>
                           <p className="text-gray-500 text-[10px] font-bold uppercase">Разом</p>
                           <p className="text-3xl font-black text-white">{calculateTotal()} <span className="text-lg text-gray-500">грн</span></p>
                        </div>
                        <button onClick={handleAddToCart} disabled={calculateTotal() === 0} className="bg-white text-black hover:bg-blue-600 hover:text-white px-8 py-3 rounded-xl font-bold flex gap-2 items-center transition disabled:opacity-50">
                           <ShoppingBag size={20}/> Купити
                        </button>
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Table (Optional) */}
        {product.variants.length > 0 && (
            <div className="mt-16 bg-[#111] rounded-3xl border border-white/5 overflow-hidden p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LayoutList/> Наявність по кольорах</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-500 border-b border-white/10"><tr><th className="p-3">Колір</th><th className="p-3">Артикул</th><th className="p-3">Залишок</th></tr></thead>
                        <tbody>
                            {product.variants.map((v: any, i: number) => {
                                const stock = v.sizes.reduce((a:any, b:any) => a + (b.stock_available || 0), 0);
                                return (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-3 font-bold flex items-center gap-2"><div className="w-6 h-6 rounded overflow-hidden relative"><ProductImage src={v.image} alt="" fill/></div>{v.color}</td>
                                        <td className="p-3 text-gray-400 font-mono">{v.sku_variant}</td>
                                        <td className="p-3 font-bold text-green-500">{stock} шт</td>
                                    </tr>
                                )
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