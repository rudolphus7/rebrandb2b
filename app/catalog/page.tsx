"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
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

// --- 1. СТРУКТУРА ДЛЯ САЙДБАРУ (Тільки UI) ---
// Ми прибрали keywords, бо категорія вже визначена в базі даних (api/sync)
const SIDEBAR_STRUCTURE = [
  {
    name: "Одяг",
    subcategories: ["Футболки", "Поло", "Реглани, фліси", "Куртки та софтшели", "Жилети", "Спортивний одяг", "Вітровки", "Рукавички", "Дитячий одяг"]
  },
  {
    name: "Головні убори",
    subcategories: ["Кепки", "Шапки", "Панами", "Дитяча кепка"]
  },
  {
    name: "Сумки",
    subcategories: ["Рюкзаки", "Сумки для покупок", "Сумки дорожні та спортивні", "Сумки для ноутбуків", "Сумки на пояс", "Валізи", "Косметички", "Термосумки", "Мішок спортивний"]
  },
  {
    name: "Ручки",
    subcategories: ["Пластикові ручки", "Металеві ручки", "Еко ручки", "Олівці"]
  },
  {
    name: "Подорож та відпочинок",
    subcategories: ["Термоси та термокружки", "Пляшки для пиття", "Фляги", "Ліхтарики", "Пледи", "Все для пікніка", "Парасолі"]
  },
  {
    name: "Офіс",
    subcategories: ["Записні книжки", "Календарі", "Шнурки", "Запальнички"]
  },
  {
    name: "Дім та Посуд",
    subcategories: ["Горнятка", "Кухонне приладдя", "Рушники", "Свічки"]
  },
  {
    name: "Електроніка",
    subcategories: ["Зарядні пристрої", "Портативна акустика", "Годинники"]
  }
];

// --- UI КОМПОНЕНТИ ---

function CategorySidebar({ activeSub, onSelect }: { activeSub: string | null, onSelect: (sub: string | null) => void }) {
    // Відкриваємо ті секції, де є активна підкатегорія
    const [openCategories, setOpenCategories] = useState<string[]>([]);

    // Авто-розкриття групи при виборі підкатегорії
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
                    // Перевіряємо, чи активна підкатегорія знаходиться в цій групі
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
                                    {group.subcategories.map(child => {
                                       const isActive = activeSub === child;
                                       return (
                                          <button 
                                              key={child}
                                              onClick={() => onSelect(child)}
                                              className={`block w-full text-left text-xs py-1.5 transition ${isActive ? 'text-blue-400 font-bold translate-x-1' : 'text-gray-500 hover:text-gray-300'}`}
                                          >
                                              {child}
                                          </button>
                                       );
                                    })}
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

// --- ГОЛОВНА ЛОГІКА ---

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Константи фільтрів
  const COLORS = ["Білий", "Чорний", "Сірий", "Синій", "Червоний", "Зелений", "Жовтий", "Оранжевий", "Коричневий", "Фіолетовий", "Бежевий", "Рожевий"];
  
  // Стейт
  const [allProducts, setAllProducts] = useState<any[]>([]); // Всі завантажені
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]); // Відфільтровані
  const [loading, setLoading] = useState(true);
  
  // Фільтри
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { addToCart, totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Ініціалізація з URL (коли переходимо з Header)
  useEffect(() => {
    const catFromUrl = searchParams.get('category');
    const qFromUrl = searchParams.get('q');
    
    if (catFromUrl) setSelectedSubCat(catFromUrl);
    if (qFromUrl) setSearchQuery(qFromUrl);
  }, [searchParams]);

  // 1. ЗАВАНТАЖЕННЯ ВСІХ ТОВАРІВ
  useEffect(() => {
    async function loadAll() {
        setLoading(true);
        // Беремо всі товари. Оскільки sync route вже розклав категорії, ми довіряємо полю `category`
        const { data, error } = await supabase.from("products").select("*");
        
        if (error || !data) {
            console.error("Error loading products", error);
            setLoading(false);
            return;
        }

        // 2. ГРУПУВАННЯ ПО АРТИКУЛУ (Клієнтське)
        // Це дозволяє злити "Футболка Червона" і "Футболка Синя" в одну картку
        const groupedMap = new Map();
        
        data.forEach((item: any) => {
            // Створюємо базовий SKU (відрізаємо частину після крапки/дефісу)
            // Наприклад: 5102.10 -> 5102
            const baseSku = item.sku ? item.sku.split(/[.\-_]/)[0] : `ID-${item.id}`;
            const cleanTitle = item.title.split(',')[0].trim(); // Прибираємо зайве з назви

            // Ключ групи: SKU + Category (щоб різні товари з схожим SKU не злилися)
            const groupKey = `${baseSku}-${item.category}`;
            
            if (!groupedMap.has(groupKey)) {
                groupedMap.set(groupKey, {
                    ...item,
                    title: cleanTitle, 
                    groupKey,
                    baseSku,
                    variants: [item],
                    // Збираємо унікальні картинки
                    variant_images: item.image_url ? [item.image_url] : [],
                    stock_total: item.amount || 0,
                    // Товар в наявності, якщо хоча б один варіант є
                    in_stock: (item.in_stock || false) || ((item.amount || 0) > 0)
                });
            } else {
                const group = groupedMap.get(groupKey);
                group.variants.push(item);
                if (item.image_url && !group.variant_images.includes(item.image_url)) {
                    group.variant_images.push(item.image_url);
                }
                group.stock_total += (item.amount || 0);
                if (item.in_stock || (item.amount > 0)) group.in_stock = true;
            }
        });

        const finalProducts = Array.from(groupedMap.values());
        setAllProducts(finalProducts);
        setDisplayedProducts(finalProducts);
        setLoading(false);
    }

    loadAll();
  }, []);

  // 3. ФІЛЬТРАЦІЯ
  useEffect(() => {
    if (loading) return;

    let result = allProducts;

    // Фільтр по категорії (порівнюємо з полем category в базі)
    if (selectedSubCat) {
        result = result.filter(p => p.category === selectedSubCat);
    }

    // Фільтр по пошуку
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(p => 
            p.title.toLowerCase().includes(q) || 
            p.baseSku?.toLowerCase().includes(q)
        );
    }

    // Фільтр по кольорах (перевіряємо чи є такий колір хоча б в одного варіанта групи)
    if (selectedColors.length > 0) {
        result = result.filter(p => {
             // Перевіряємо колір головного товару або його варіантів
             const productColors = p.variants.map((v: any) => v.color).filter(Boolean);
             // Якщо хоча б один вибраний колір є в списку кольорів товару
             return selectedColors.some(c => productColors.includes(c));
        });
    }

    setDisplayedProducts(result);

  }, [selectedSubCat, searchQuery, selectedColors, allProducts, loading]);


  const handleAddToCart = (product: any) => {
    addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        image_url: product.image_url,
        quantity: 1
    });
    setIsCartOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSelectCategory = (sub: string | null) => {
      setSelectedSubCat(sub);
      // Оновлюємо URL без перезавантаження
      if (sub) {
        router.push(`/catalog?category=${sub}`, { scroll: false });
      } else {
        router.push(`/catalog`, { scroll: false });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleColor = (color: string) => {
      setSelectedColors(prev => 
          prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
      );
  };

  const handleResetFilters = () => {
      setSelectedSubCat(null);
      setSearchQuery("");
      setSelectedColors([]);
      router.push('/catalog', { scroll: false });
  };

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans">
      <Header onCartClick={() => setIsCartOpen(true)} cartCount={totalItems} onLogout={handleLogout} />

      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
         <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
             <Link href="/" className="hover:text-white">Головна</Link> / 
             <span className="text-white cursor-pointer" onClick={handleResetFilters}>Каталог</span>
             {selectedSubCat && <> / <span className="text-blue-400">{selectedSubCat}</span></>}
         </div>
         
         {/* Пошук зверху */}
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
        {/* SIDEBAR */}
        <aside className="w-64 flex-shrink-0 hidden lg:block bg-[#1a1a1a] rounded-xl border border-white/5 p-4 sticky top-24 h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
           {(selectedSubCat || searchQuery || selectedColors.length > 0) && (
              <button 
                onClick={handleResetFilters} 
                className="text-xs text-red-400 flex items-center gap-1 hover:underline mb-4 w-full text-left"
              >
                  <X size={12}/> Скинути фільтри
              </button>
           )}
           
           <CategorySidebar activeSub={selectedSubCat} onSelect={handleSelectCategory} />
           
           <div className="w-full h-[1px] bg-white/10 my-6"></div>
           <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Filter size={18}/> Фільтри</h3>
           <FilterGroup title="Колір" items={COLORS} selected={selectedColors} onChange={toggleColor} />
        </aside>

        {/* PRODUCT GRID */}
        <div className="flex-1">
           <div className="flex justify-between items-center mb-6 bg-[#1a1a1a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-gray-500 uppercase tracking-widest ml-2">Знайдено: {displayedProducts.length}</span>
           </div>

           {displayedProducts.length === 0 && !loading ? (
               <div className="text-center py-20 bg-[#1a1a1a] rounded-xl border border-white/5">
                   <div className="inline-flex bg-white/5 p-4 rounded-full mb-4"><Search size={32} className="text-gray-500"/></div>
                   <h3 className="text-xl font-bold mb-2">Товарів не знайдено</h3>
                   <p className="text-gray-400 mb-6">Спробуйте змінити категорію або пошуковий запит</p>
                   <button onClick={handleResetFilters} className="text-blue-400 hover:underline">Показати всі товари</button>
               </div>
           ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                 {loading ? (
                     <div className="col-span-full h-96 flex items-center justify-center">
                         <Loader2 className="animate-spin text-blue-500" size={48} />
                         <span className="ml-3 text-lg font-bold">Оновлення каталогу...</span>
                     </div>
                 ) : (
                   displayedProducts.map((item) => (
                     <div key={item.groupKey || item.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 hover:border-blue-500/30 hover:shadow-2xl transition group flex gap-3 h-full relative">
                       {/* Color Dots (Left Side) */}
                       <div className="flex flex-col gap-2 w-10 flex-shrink-0 pt-2 z-10">
                          {item.variant_images.length > 0 ? (
                             item.variant_images.slice(0, 5).map((img: string, idx: number) => (
                             <div key={idx} className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-white cursor-pointer relative bg-black transition hover:scale-110">
                                 <ProductImage src={img} alt="Color" fill />
                             </div>
                             ))
                          ) : (
                             <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[8px] text-zinc-500">N/A</div>
                          )}
                          {item.variant_images.length > 5 && <div className="text-[10px] text-gray-500 text-center font-bold">+{item.variant_images.length - 5}</div>}
                       </div>
                       
                       {/* Main Content */}
                       <div className="flex-1 flex flex-col min-w-0">
                          <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden mb-3 relative">
                             <Link href={`/product/${item.external_id || item.id}`} className="block w-full h-full">
                               <ProductImage src={item.image_url} alt={item.title} fill className="group-hover:scale-105 transition duration-500"/>
                             </Link>
                             <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                 {item.in_stock && <div className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">В наявності</div>}
                             </div>
                          </div>
                          <div className="mb-2">
                             <Link href={`/product/${item.external_id || item.id}`} className="font-bold text-sm leading-tight text-gray-100 hover:text-blue-400 transition line-clamp-2 mb-1" title={item.title}>
                                 {item.title}
                             </Link>
                             <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                 <span>Арт: {item.baseSku}</span>
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
    <Suspense fallback={<div className="bg-black min-h-screen text-white p-10 flex items-center justify-center"><Loader2 className="animate-spin mr-2"/> Завантаження каталогу...</div>}>
      <CatalogContent />
    </Suspense>
  );
}