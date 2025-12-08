"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  Search, Filter, ChevronDown, ChevronUp, Check, 
  X, Menu, Loader2, ShoppingCart
} from "lucide-react";
import ProductImage from "../components/ProductImage";
import { useCart } from "../components/CartContext"; 
import Header from "../components/Header";
import CartDrawer from "../components/CartDrawer";

// Структура категорій
const SIDEBAR_STRUCTURE = [
  { name: "Сумки", subcategories: ["Валізи", "Косметички", "Мішок спортивний", "Рюкзаки", "Сумки для ноутбуків", "Сумки для покупок", "Сумки дорожні та спортивні", "Сумки на пояс", "Термосумки"] },
  { name: "Ручки", subcategories: ["Еко ручки", "Металеві ручки", "Олівці", "Пластикові ручки"] },
  { name: "Подорож та відпочинок", subcategories: ["Все для пікніка", "Ліхтарики", "Ланч бокси", "Лопати", "Пледи", "Пляшки для пиття", "Подушки", "Термоси та термокружки", "Фляги", "Фрізбі", "Штопори"] },
  { name: "Парасолі", subcategories: ["Парасолі складні", "Парасолі-тростини"] },
  { name: "Одяг", subcategories: ["Вітровки", "Рукавички", "Спортивний одяг", "Футболки", "Поло", "Дитячий одяг", "Реглани, фліси", "Жилети", "Куртки та софтшели"] },
  { name: "Головні убори", subcategories: ["Дитяча кепка", "Панами", "Шапки", "Кепки"] },
  { name: "Інструменти", subcategories: ["Викрутки", "Мультитули", "Набір інструментів", "Ножі", "Рулетки"] },
  { name: "Офіс", subcategories: ["Записні книжки", "Календарі"] },
  { name: "Персональні аксессуари", subcategories: ["Брелки", "Візитниці", "Дзеркала"] },
  { name: "Для професіоналів", subcategories: ["Опадоміри"] },
  { name: "Електроніка", subcategories: ["Аксесуари", "Годинники", "Зарядні пристрої", "Зволожувачі повітря", "Лампи", "Портативна акустика"] },
  { name: "Дім", subcategories: ["Дошки кухонні", "Кухонне приладдя", "Млини для спецій", "Набори для сиру", "Рушники", "Свічки", "Сковорідки", "Стакани", "Чайники", "Годівнички"] },
  { name: "Посуд", subcategories: ["Горнятка"] },
  { name: "Упаковка", subcategories: ["Подарункова коробка", "Подарунковий пакет"] }
];

// --- UI COMPONENTS ---
function CategorySidebar({ activeSub, onSelect }: { activeSub: string | null, onSelect: (sub: string | null) => void }) {
    const [openCategories, setOpenCategories] = useState<string[]>([]);

    useEffect(() => {
        if (activeSub) {
            const parent = SIDEBAR_STRUCTURE.find(g => g.subcategories.includes(activeSub));
            if (parent && !openCategories.includes(parent.name)) {
                setOpenCategories(prev => [...prev, parent.name]);
            }
        }
    }, [activeSub]);

    const toggleCategory = (name: string) => {
        setOpenCategories(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
    };

    return (
        <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Menu size={18}/> Категорії</h3>
            <div className="space-y-1">
                {SIDEBAR_STRUCTURE.map(group => {
                    const isOpen = openCategories.includes(group.name);
                    const hasActiveChild = activeSub && group.subcategories.includes(activeSub);

                    return (
                        <div key={group.name} className="border-b border-white/5 last:border-0">
                            <button 
                                className={`flex items-center justify-between w-full py-2 px-2 rounded cursor-pointer transition ${hasActiveChild ? 'text-blue-400' : 'text-gray-300 hover:bg-white/5'}`}
                                onClick={() => toggleCategory(group.name)}
                            >
                                <span className="text-sm font-bold uppercase text-left">{group.name}</span>
                                {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            
                            {isOpen && (
                                <div className="pl-4 pb-2 space-y-1 border-l-2 border-white/10 ml-2 mt-1">
                                    {group.subcategories.map(child => (
                                          <button 
                                              key={child}
                                              onClick={() => onSelect(child)}
                                              className={`block w-full text-left text-xs py-1.5 transition ${activeSub === child ? 'text-blue-400 font-bold translate-x-1' : 'text-gray-500 hover:text-gray-300'}`}
                                          >
                                              {child}
                                          </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function FilterGroup({ title, items, selected, onChange }: { title: string, items: string[], selected: string[], onChange: (item: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-4">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-sm font-bold uppercase tracking-wider mb-2 hover:text-blue-400 transition">
        {title} {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>
      {isOpen && (
        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                <div className={`relative w-4 h-4 border rounded flex items-center justify-center transition ${selected.includes(item) ? 'border-blue-500 bg-blue-500' : 'border-white/20 group-hover:border-blue-500'}`}>
                  <input type="checkbox" className="hidden" checked={selected.includes(item)} onChange={() => onChange(item)}/>
                  <Check size={10} className={`text-white transition ${selected.includes(item) ? 'opacity-100' : 'opacity-0'}`}/>
                </div>
                <span className={`text-sm transition ${selected.includes(item) ? 'text-white font-bold' : 'text-gray-400 group-hover:text-white'}`}>{item}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  );
}

// --- MAIN LOGIC ---

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToCart, totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Filters
  const COLORS = ["Білий", "Чорний", "Сірий", "Синій", "Червоний", "Зелений", "Жовтий", "Оранжевий", "Коричневий", "Фіолетовий", "Бежевий", "Рожевий"];
  
  // Data State
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync with URL
  useEffect(() => {
    const cat = searchParams.get('category');
    const q = searchParams.get('q');
    if (cat) setSelectedSubCat(cat);
    if (q) setSearchQuery(q);
  }, [searchParams]);

  // 1. ЗАВАНТАЖЕННЯ ДАНИХ (ПРОСТЕ, БЕЗ ГРУПУВАННЯ)
  // Бекенд вже все згрупував!
  useEffect(() => {
    async function loadData() {
        setLoading(true);
        const { data, error } = await supabase.from("products").select("*");
        
        if (error) {
            console.error("Error loading products:", error);
        } else {
            setAllProducts(data || []);
            setDisplayedProducts(data || []);
        }
        setLoading(false);
    }
    loadData();
  }, []);

  // 2. ФІЛЬТРАЦІЯ
  useEffect(() => {
    if (loading) return;

    let result = allProducts;

    // По категорії
    if (selectedSubCat) {
        result = result.filter(p => p.category === selectedSubCat);
    }

    // Пошук (по назві або артикулу)
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(p => 
            (p.title && p.title.toLowerCase().includes(q)) || 
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.base_sku && p.base_sku.toLowerCase().includes(q))
        );
    }

    // По кольору (шукаємо всередині variants)
    if (selectedColors.length > 0) {
        result = result.filter(p => {
             if (!p.variants || !Array.isArray(p.variants)) return false;
             // Якщо хоч один варіант має вибраний колір
             return p.variants.some((v: any) => selectedColors.includes(v.color));
        });
    }

    setDisplayedProducts(result);
  }, [selectedSubCat, searchQuery, selectedColors, allProducts, loading]);

  const handleAddToCart = (item: any) => {
      // Додаємо просто модель (без розміру за замовчуванням, або перший ліпший)
      // Краще перекинути на сторінку товару, але якщо треба кнопка "Купити":
      addToCart({
          id: item.external_id,
          title: item.title,
          price: item.price,
          image_url: item.image_url,
          quantity: 1
      });
      setIsCartOpen(true);
  };

  const handleResetFilters = () => {
      setSelectedSubCat(null);
      setSearchQuery("");
      setSelectedColors([]);
      router.push('/catalog', { scroll: false });
  };

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans">
      <Header onCartClick={() => setIsCartOpen(true)} cartCount={totalItems} onLogout={async () => { await supabase.auth.signOut(); router.push("/"); }} />

      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
         {/* Top Bar */}
         <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
             <Link href="/" className="hover:text-white">Головна</Link> / 
             <span className="text-white cursor-pointer" onClick={handleResetFilters}>Каталог</span>
             {selectedSubCat && <> / <span className="text-blue-400">{selectedSubCat}</span></>}
         </div>
         
         <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
             <h1 className="text-3xl font-black uppercase text-white">
                 {selectedSubCat || "Всі товари"}
             </h1>
             <div className="relative w-full md:w-96">
                <input 
                    type="text" 
                    placeholder="Пошук товару..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                />
                <Search className="absolute right-4 top-3 text-gray-500" size={20}/>
             </div>
         </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pb-20 flex gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 hidden lg:block bg-[#1a1a1a] rounded-xl border border-white/5 p-4 sticky top-24 h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
           {(selectedSubCat || searchQuery || selectedColors.length > 0) && (
              <button onClick={handleResetFilters} className="text-xs text-red-400 flex items-center gap-1 hover:underline mb-4 w-full text-left">
                  <X size={12}/> Скинути фільтри
              </button>
           )}
           <CategorySidebar activeSub={selectedSubCat} onSelect={(sub) => { setSelectedSubCat(sub); if(sub) router.push(`/catalog?category=${sub}`, {scroll: false}); }} />
           <div className="w-full h-[1px] bg-white/10 my-6"></div>
           <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Filter size={18}/> Фільтри</h3>
           <FilterGroup title="Колір" items={COLORS} selected={selectedColors} onChange={(c) => setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} />
        </aside>

        {/* Grid */}
        <div className="flex-1">
           <div className="flex justify-between items-center mb-6 bg-[#1a1a1a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-gray-500 uppercase tracking-widest ml-2">Знайдено: {displayedProducts.length}</span>
           </div>

           {displayedProducts.length === 0 && !loading ? (
               <div className="text-center py-20 bg-[#1a1a1a] rounded-xl border border-white/5">
                   <div className="inline-flex bg-white/5 p-4 rounded-full mb-4"><Search size={32} className="text-gray-500"/></div>
                   <h3 className="text-xl font-bold mb-2">Товарів не знайдено</h3>
                   <button onClick={handleResetFilters} className="text-blue-400 hover:underline">Показати всі</button>
               </div>
           ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                 {loading ? (
                     <div className="col-span-full h-96 flex items-center justify-center">
                         <Loader2 className="animate-spin text-blue-500" size={48} />
                         <span className="ml-3 text-lg font-bold">Оновлення...</span>
                     </div>
                 ) : (
                   displayedProducts.map((item) => (
                     <div key={item.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 hover:border-blue-500/30 hover:shadow-2xl transition group flex gap-3 h-full relative">
                       {/* Color Dots (ІКОНКИ КОЛЬОРІВ, А НЕ РОЗМІРІВ) */}
                       <div className="flex flex-col gap-2 w-10 flex-shrink-0 pt-2 z-10">
                          {/* Показуємо перші 5 кольорів з variants */}
                          {item.variants && item.variants.length > 0 ? (
                             item.variants.slice(0, 5).map((v: any, idx: number) => (
                               <div key={idx} className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-white cursor-pointer relative bg-black transition hover:scale-110" title={v.color}>
                                   <ProductImage src={v.image} alt={v.color} fill />
                               </div>
                             ))
                          ) : (
                             <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[8px] text-zinc-500">N/A</div>
                          )}
                          {item.variants && item.variants.length > 5 && <div className="text-[10px] text-gray-500 text-center font-bold">+{item.variants.length - 5}</div>}
                       </div>
                       
                       {/* Content */}
                       <div className="flex-1 flex flex-col min-w-0">
                          <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden mb-3 relative">
                             {/* Посилання на сторінку товару */}
                             <Link href={`/product/${item.external_id}`} className="block w-full h-full">
                               <ProductImage src={item.image_url} alt={item.title} fill className="group-hover:scale-105 transition duration-500"/>
                             </Link>
                             <div className="absolute top-2 right-2">
                                 {item.in_stock && <div className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">В наявності</div>}
                             </div>
                          </div>
                          <div className="mb-2">
                             <Link href={`/product/${item.external_id}`} className="font-bold text-sm leading-tight text-gray-100 hover:text-blue-400 transition line-clamp-2 mb-1">
                                 {item.title}
                             </Link>
                             <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                 <span>Арт: {item.sku}</span>
                                 <span className="text-zinc-400">{item.brand}</span>
                             </div>
                          </div>
                          <div className="text-xl font-bold text-white mb-3">{item.price > 0 ? <>{item.price} <span className="text-xs font-normal text-gray-400">ГРН</span></> : <span className="text-sm text-blue-400">Ціна за запитом</span>}</div>
                          
                          <button onClick={() => handleAddToCart(item)} className="mt-2 w-full bg-white text-black font-bold py-2 rounded hover:bg-blue-600 hover:text-white transition text-sm flex items-center justify-center gap-2">
                              <ShoppingCart size={16} /> В кошик
                          </button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
           )}
        </div>
      </main>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen text-white p-10 flex items-center justify-center">Завантаження...</div>}>
      <CatalogContent />
    </Suspense>
  );
}