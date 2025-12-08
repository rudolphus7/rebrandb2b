"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  Search, Filter, ChevronDown, ChevronUp, Check, 
  Home as HomeIcon, X, Menu, Loader2, RefreshCcw
} from "lucide-react";
import ProductImage from "../components/ProductImage";
import { useCart } from "../components/CartContext"; 
import Header from "../components/Header";
import CartDrawer from "../components/CartDrawer";

// --- ТИПИ ---
interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

// --- КОМПОНЕНТ ДЕРЕВА КАТЕГОРІЙ ---
function CategorySidebar({ activeCategory }: { activeCategory: string | null }) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [openCategories, setOpenCategories] = useState<string[]>([]);

    useEffect(() => {
        // Завантажуємо категорії і сортуємо
        supabase.from('categories').select('*').order('title').then(({ data }) => {
            if (data) {
                const mapped = data.map(c => ({
                    id: c.id, 
                    name: c.title || c.name || "Без назви", // Захист від пустих назв
                    parent_id: c.parent_id
                }));
                setCategories(mapped);
            }
        });
    }, []);

    // Авто-розкриття при завантаженні
    useEffect(() => {
        if (activeCategory && categories.length > 0) {
            // Шукаємо категорію нестрого (ігноруємо регістр)
            const activeItem = categories.find(c => c.name.toLowerCase() === activeCategory.toLowerCase());
            
            if (activeItem) {
                const parentsToOpen: string[] = [];
                
                // Якщо це підкатегорія, відкриваємо батька
                if (activeItem.parent_id) {
                    const parent = categories.find(p => p.id === activeItem.parent_id);
                    if (parent) parentsToOpen.push(parent.name);
                }
                // Відкриваємо саму категорію, якщо у неї є діти
                const hasChildren = categories.some(c => c.parent_id === activeItem.id);
                if (hasChildren) parentsToOpen.push(activeItem.name);
                
                setOpenCategories(prev => [...Array.from(new Set([...prev, ...parentsToOpen]))]);
            }
        }
    }, [activeCategory, categories]);

    const rootCategories = categories.filter(c => !c.parent_id);
    const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

    const toggleCategory = (name: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenCategories(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
    };

    return (
        <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Menu size={18}/> Категорії</h3>
            <div className="space-y-1">
                {rootCategories.map(rootCat => {
                    const children = getChildren(rootCat.id);
                    const isOpen = openCategories.includes(rootCat.name);
                    // Перевірка активності (case-insensitive)
                    const isActive = activeCategory?.toLowerCase() === rootCat.name.toLowerCase();

                    return (
                        <div key={rootCat.id} className="border-b border-white/5 last:border-0">
                            <div className="flex items-center justify-between py-2 group hover:bg-white/5 px-2 rounded transition">
                                <Link 
                                    href={`/catalog?category=${rootCat.name}`}
                                    className={`text-sm font-bold uppercase transition flex-1 ${isActive ? 'text-blue-400' : 'text-gray-300 hover:text-white'}`}
                                >
                                    {rootCat.name}
                                </Link>
                                {children.length > 0 && (
                                    <button onClick={(e) => toggleCategory(rootCat.name, e)} className="p-1 text-gray-500 hover:text-white transition">
                                        {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                    </button>
                                )}
                            </div>
                            {isOpen && children.length > 0 && (
                                <div className="pl-4 pb-2 space-y-1 border-l-2 border-white/10 ml-2 mt-1">
                                    {children.map(child => {
                                         const isChildActive = activeCategory?.toLowerCase() === child.name.toLowerCase();
                                         return (
                                            <Link 
                                                key={child.id}
                                                href={`/catalog?category=${child.name}`}
                                                className={`block text-xs py-1.5 transition ${isChildActive ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {child.name}
                                            </Link>
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

function FilterGroup({ title, items, paramName, isOpenDefault = false }: { title: string, items: string[], paramName: string, isOpenDefault?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [search, setSearch] = useState("");
  
  const selectedItems = searchParams.get(paramName)?.split(",") || [];
  const filteredItems = items.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  const handleToggle = (item: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    let newSelected = [...selectedItems];
    if (newSelected.includes(item)) {
      newSelected = newSelected.filter(i => i !== item);
    } else {
      newSelected.push(item);
    }
    
    if (newSelected.length > 0) current.set(paramName, newSelected.join(","));
    else current.delete(paramName);
    
    // Скидаємо пагінацію при зміні фільтрів
    router.push(`/catalog?${current.toString()}`);
  };

  return (
    <div className="border-b border-white/10 py-4">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-sm font-bold uppercase tracking-wider mb-2 hover:text-blue-400 transition">
        {title} {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>
      {isOpen && (
        <div className="mt-2">
          {items.length > 10 && (
             <div className="relative mb-3">
                <input type="text" placeholder="Пошук..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"/>
             </div>
          )}
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {filteredItems.map((item, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                <div className={`relative w-4 h-4 border rounded flex items-center justify-center transition ${selectedItems.includes(item) ? 'border-blue-500 bg-blue-500' : 'border-white/20 group-hover:border-blue-500'}`}>
                  <input type="checkbox" className="peer appearance-none w-full h-full absolute inset-0 cursor-pointer" checked={selectedItems.includes(item)} onChange={() => handleToggle(item)}/>
                  <Check size={10} className={`text-white transition ${selectedItems.includes(item) ? 'opacity-100' : 'opacity-0'}`}/>
                </div>
                <span className={`text-sm transition ${selectedItems.includes(item) ? 'text-white font-bold' : 'text-gray-400 group-hover:text-white'}`}>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const ITEMS_PER_PAGE = 100;
  
  const query = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category"); 
  const colorParam = searchParams.get("color");
  const materialParam = searchParams.get("material");
  const genderParam = searchParams.get("gender");

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const { addToCart, totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const COLORS = ["Білий", "Чорний", "Сірий", "Синій", "Червоний", "Зелений", "Жовтий", "Оранжевий", "Коричневий", "Фіолетовий", "Бежевий", "Рожевий"];
  const MATERIALS = ["Бавовна", "Поліестер", "Еластан", "Фліс", "Метал", "Пластик", "Кераміка", "Скло", "Дерево", "Шкіра"];
  const GENDER = ["Чоловічий", "Жіночий", "Унісекс", "Дитячий"];

  useEffect(() => {
    setProducts([]);
    setPage(0);
    setHasMore(true);
    fetchData(0, true);
  }, [query, categoryParam, colorParam, materialParam, genderParam]);

  const getCleanTitle = (title: string) => {
      if (!title) return "unknown";
      const colorRegex = new RegExp(`(${COLORS.join('|')}|Red|Blue|Black|White|Grey|Green|Yellow|Orange)`, 'gi');
      return title.replace(colorRegex, '').trim();
  };

  async function fetchData(pageIndex: number, isNewSearch: boolean = false) {
    if (isNewSearch) setLoading(true);
    else setLoadingMore(true);

    let request = supabase.from("products").select("*");

    // --- ФІЛЬТРАЦІЯ ---
    if (query) request = request.ilike("title", `%${query}%`);

    // 🔥 ВИПРАВЛЕНА ЛОГІКА КАТЕГОРІЙ
    if (categoryParam) {
        // 1. Шукаємо категорію в базі за назвою
        const { data: catData } = await supabase.from('categories').select('id, title').ilike('title', categoryParam).maybeSingle();
        
        // Список слів для пошуку (починаємо з самої назви категорії)
        let searchTerms = [categoryParam];

        if (catData) {
            // 2. Якщо знайшли категорію, шукаємо її дітей (підкатегорії)
            const { data: children } = await supabase.from('categories').select('title').eq('parent_id', catData.id);
            if (children && children.length > 0) {
                // Додаємо назви підкатегорій до пошуку (наприклад: "Валізи", "Рюкзаки")
                children.forEach(c => {
                    if (c.title) searchTerms.push(c.title);
                });
            }
        }

        // 3. Формуємо запит "OR": шукаємо або точний збіг по текстовому полю category, 
        // або входження будь-якого зі слів у поле category
        // Це дозволяє знайти товар "Дорожня валіза" якщо обрана категорія "Сумки" (а валіза є підкатегорією)
        
        const textConditions = searchTerms.map(term => `category.ilike.%${term}%`);
        
        // Можна додати пошук і в title, якщо структура категорій в товарі не заповнена
        // const titleConditions = searchTerms.map(term => `title.ilike.%${term}%`);
        
        request = request.or(textConditions.join(','));
    }

    if (colorParam) request = request.in('color', colorParam.split(","));
    
    if (materialParam) {
        const orQuery = materialParam.split(",").map(m => `description.ilike.%${m}%`).join(",");
        request = request.or(orQuery);
    }
    if (genderParam) {
        const orQuery = genderParam.split(",").map(g => `description.ilike.%${g}%`).join(",");
        request = request.or(orQuery);
    }

    // --- ПАГІНАЦІЯ ---
    const from = pageIndex * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error } = await request.range(from, to).order("id", { ascending: true });

    if (error) {
        console.error("Error fetching products:", error);
        setLoading(false);
        setLoadingMore(false);
        return;
    }

    if (!data || data.length === 0) {
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
    }

    if (data.length < ITEMS_PER_PAGE) {
        setHasMore(false);
    }

    processProducts(data, isNewSearch);
  }

  const processProducts = (newData: any[], isNewSearch: boolean) => {
    const currentProducts = isNewSearch ? [] : products;
    const groupedMap = new Map<string, any>();

    currentProducts.forEach(p => {
        const key = p.groupKey;
        groupedMap.set(key, { ...p });
    });

    newData.forEach((item) => {
        const rawSku = item.sku ? item.sku.trim() : "";
        let baseSku = rawSku.split(/[\s\-_./\\]+/)[0];
        
        let groupKey = "";
        if (baseSku && baseSku.length > 3) {
             groupKey = baseSku;
        } else {
             groupKey = getCleanTitle(item.title);
        }
        
        if (item.brand) groupKey += `-${item.brand}`;

        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
                ...item,
                groupKey: groupKey, 
                title: item.title, 
                variants: [item],
                variant_images: item.image_url ? [item.image_url] : [],
                stock_total: item.amount || 0,
                stock_reserve: item.reserve || 0,
                active_image: item.image_url,
                in_stock: item.in_stock || false 
            });
        } else {
            const group = groupedMap.get(groupKey);
            if (!group.variants.find((v:any) => v.id === item.id)) {
                group.variants.push(item);
                if (item.image_url && !group.variant_images.includes(item.image_url)) {
                    group.variant_images.push(item.image_url);
                }
                group.stock_total += (item.amount || 0);
                group.stock_reserve += (item.reserve || 0);
                if (!group.in_stock && item.in_stock) {
                    group.in_stock = true;
                }
            }
        }
    });

    const processed = Array.from(groupedMap.values()).map((group: any) => ({
        ...group,
        stock_free: group.stock_total - group.stock_reserve,
        article: group.sku ? group.sku.split(/[\s\-_./\\]+/)[0] : `ART-${group.id}`,
        brand: group.brand || "Partner" 
    }));

    setProducts(processed);
    setLoading(false);
    setLoadingMore(false);
  };

  const handleLoadMore = () => {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, false);
  };

  const handleAddToCart = (product: any) => {
    addToCart({
        id: product.id,
        title: product.title || product.description,
        price: product.price,
        image_url: product.active_image || product.image_url,
        quantity: 1
    });
    setIsCartOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans">
      <Header onCartClick={() => setIsCartOpen(true)} cartCount={totalItems} onLogout={handleLogout} />

      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
         <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
             <Link href="/" className="hover:text-white">Головна</Link> / <span className="text-white">Каталог</span>
             {categoryParam && <> / <span className="text-blue-400">{categoryParam}</span></>}
         </div>
         <h1 className="text-3xl font-black uppercase text-white">{categoryParam || (query ? `Пошук: "${query}"` : "Всі товари")}</h1>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pb-20 flex gap-8 items-start">
        {/* SIDEBAR */}
        <aside className="w-64 flex-shrink-0 hidden lg:block bg-[#1a1a1a] rounded-xl border border-white/5 p-4 sticky top-24 h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
           {(categoryParam || query || colorParam || materialParam || genderParam) && (
              <Link href="/catalog" className="text-xs text-red-400 flex items-center gap-1 hover:underline mb-4 block"><X size={12}/> Скинути все</Link>
           )}
           <CategorySidebar activeCategory={categoryParam} />
           <div className="w-full h-[1px] bg-white/10 my-6"></div>
           <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Filter size={18}/> Фільтри</h3>
           <FilterGroup title="Колір" items={COLORS} paramName="color" isOpenDefault={true} />
           <FilterGroup title="Матеріал" items={MATERIALS} paramName="material" />
           <FilterGroup title="Стать" items={GENDER} paramName="gender" />
        </aside>

        {/* PRODUCT GRID */}
        <div className="flex-1">
           <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-[#1a1a1a] p-3 rounded-xl border border-white/5">
              <div className="flex gap-1 text-sm font-bold overflow-x-auto w-full md:w-auto">
                 <button onClick={() => router.push('/catalog')} className={`px-4 py-2 rounded-lg transition ${!categoryParam ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/10'}`}>Всі товари</button>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-widest mr-4">Показано {products.length} моделей</span>
           </div>

           {products.length === 0 && !loading ? (
               <div className="text-center py-20 bg-[#1a1a1a] rounded-xl border border-white/5">
                   <div className="inline-flex bg-white/5 p-4 rounded-full mb-4"><Search size={32} className="text-gray-500"/></div>
                   <h3 className="text-xl font-bold mb-2">Товарів не знайдено</h3>
                   <p className="text-gray-400 mb-6">Спробуйте змінити фільтри або категорію</p>
                   <Link href="/catalog" className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Показати всі товари</Link>
               </div>
           ) : (
               <>
                   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                     {loading ? [...Array(8)].map((_, i) => <div key={i} className="h-96 bg-[#1a1a1a] rounded-xl animate-pulse"></div>) : 
                       products.map((item) => (
                         <div key={item.groupKey || item.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 hover:border-blue-500/30 hover:shadow-2xl transition group flex gap-3 h-full relative">
                           <div className="flex flex-col gap-2 w-10 flex-shrink-0 pt-2 z-10">
                              {item.variant_images.length > 0 ? (
                                 item.variant_images.slice(0, 6).map((img: string, idx: number) => (
                                 <div key={idx} className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-white cursor-pointer relative bg-black transition hover:scale-110">
                                     <ProductImage src={img} alt="Color" fill />
                                 </div>
                                 ))
                              ) : (
                                 <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[8px] text-zinc-500">N/A</div>
                              )}
                              {item.variant_images.length > 6 && <div className="text-[10px] text-gray-500 text-center font-bold">+{item.variant_images.length - 6}</div>}
                           </div>
                           <div className="flex-1 flex flex-col min-w-0">
                              <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden mb-3 relative">
                                 <Link href={`/product/${item.id}`} className="block w-full h-full">
                                   <ProductImage src={item.active_image || item.image_url} alt={item.title} fill className="group-hover:scale-105 transition duration-500"/>
                                 </Link>
                                 <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                     {item.in_stock && <div className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">В наявності</div>}
                                 </div>
                              </div>
                              <div className="mb-2">
                                 <Link href={`/product/${item.id}`} className="font-bold text-sm leading-tight text-gray-100 hover:text-blue-400 transition line-clamp-2 mb-1" title={item.title}>
                                     {item.variants.length > 1 ? getCleanTitle(item.title) : item.title}
                                 </Link>
                                 <div className="flex justify-between text-[10px] text-gray-500 mt-1"><span>Арт: {item.article}</span><span className="text-zinc-400">{item.brand}</span></div>
                              </div>
                              <div className="text-xl font-bold text-white mb-3">{item.price > 0 ? <>{item.price} <span className="text-xs font-normal text-gray-400">ГРН</span></> : <span className="text-sm text-blue-400">Ціна за запитом</span>}</div>
                              <div className="mb-2 text-xs">
                                {item.in_stock ? <span className="text-green-400 font-bold flex items-center gap-1"><Check size={12}/> Є на складі</span> : <span className="text-red-400 font-bold flex items-center gap-1"><X size={12}/> Під замовлення</span>}
                              </div>
                              <button onClick={() => handleAddToCart(item)} className="mt-2 w-full bg-white text-black font-bold py-2 rounded hover:bg-blue-600 hover:text-white transition text-sm flex items-center justify-center gap-2">В кошик</button>
                           </div>
                         </div>
                       ))
                     }
                   </div>
                   
                   {/* Load More Button */}
                   {hasMore && !loading && (
                       <div className="mt-8 flex justify-center">
                           <button 
                               onClick={handleLoadMore} 
                               disabled={loadingMore}
                               className="bg-[#222] border border-white/10 text-white px-8 py-3 rounded-xl font-bold hover:bg-white hover:text-black transition flex items-center gap-2 disabled:opacity-50"
                           >
                               {loadingMore ? <Loader2 className="animate-spin" size={20}/> : <RefreshCcw size={20}/>}
                               {loadingMore ? "Завантаження..." : "Завантажити ще товари"}
                           </button>
                       </div>
                   )}
               </>
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