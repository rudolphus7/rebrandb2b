"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  Search, Filter, ChevronDown, ChevronUp, Check, 
  Home as HomeIcon, X, ChevronRight, Menu
} from "lucide-react";
import ProductImage from "../components/ProductImage";
import { useCart } from "../components/CartContext"; 
import Header from "../components/Header";
import CartDrawer from "../components/CartDrawer";

// --- 1. ПОВНА КАРТА КАТЕГОРІЙ ---
const CATEGORIES_MAP = [
  // СПЕЦІАЛЬНІ
  { id: "270", name: "Новинки" },
  { id: "213", name: "Акційна пропозиція", aliases: ["Акційні пропозиції"] },
  { id: "discount", name: "Уцінка" },

  // СУМКИ
  { id: "189", name: "Сумки", aliases: ["Сумки & Рюкзаки"] },
  { id: "196", parentId: "189", name: "Валізи" },
  { id: "284", parentId: "189", name: "Косметички" },
  { id: "217", parentId: "189", name: "Мішок спортивний" },
  { id: "304", parentId: "189", name: "Рюкзаки" },
  { id: "192", parentId: "189", name: "Сумки для ноутбуків" },
  { id: "264", parentId: "189", name: "Сумки для покупок", aliases: ["Шопери"] },
  { id: "193", parentId: "189", name: "Сумки дорожні та спортивні" },
  { id: "271", parentId: "189", name: "Сумки на пояс", aliases: ["Бананки"] },
  { id: "280", parentId: "189", name: "Термосумки" },

  // РУЧКИ
  { id: "186", name: "Ручки" },
  { id: "269", parentId: "186", name: "Еко ручки" },
  { id: "187", parentId: "186", name: "Металеві ручки" },
  { id: "314", parentId: "186", name: "Олівці" },
  { id: "188", parentId: "186", name: "Пластикові ручки" },

  // ПОДОРОЖ ТА ВІДПОЧИНОК
  { id: "183", name: "Подорож та відпочинок", aliases: ["Дім & Відпочинок"] },
  { id: "259", parentId: "183", name: "Все для пікніка" },
  { id: "287", parentId: "183", name: "Ліхтарики" },
  { id: "273", parentId: "183", name: "Ланч бокси", aliases: ["Ланчбокси"] },
  { id: "288", parentId: "183", name: "Лопати" },
  { id: "195", parentId: "183", name: "Пледи" },
  { id: "184", parentId: "183", name: "Пляшки для пиття", aliases: ["Пляшки"] },
  { id: "303", parentId: "183", name: "Подушки" },
  { id: "185", parentId: "183", name: "Термоси та термокружки", aliases: ["Термочашки", "Термоси"] },
  { id: "216", parentId: "183", name: "Фляги" },
  { id: "305", parentId: "183", name: "Фрізбі" },
  { id: "276", parentId: "183", name: "Штопори" },

  // ПАРАСОЛІ
  { id: "227", name: "Парасолі" },
  { id: "249", parentId: "227", name: "Парасолі складні" },
  { id: "236", parentId: "227", name: "Парасолі-тростини" },

  // ОДЯГ
  { id: "181", name: "Одяг", aliases: ["Одяг & Текстиль"] },
  { id: "307", parentId: "181", name: "Вітровки" },
  { id: "312", parentId: "181", name: "Рукавички" },
  { id: "255", parentId: "181", name: "Спортивний одяг" },
  { id: "182", parentId: "181", name: "Футболки" },
  { id: "238", parentId: "181", name: "Поло" },
  { id: "239", parentId: "181", name: "Дитячий одяг" },
  { id: "246", parentId: "181", name: "Реглани, фліси", aliases: ["Худі & Світшоти", "Фліс"] },
  { id: "215", parentId: "181", name: "Жилети", aliases: ["Жилетки"] },
  { id: "243", parentId: "181", name: "Куртки та софтшели" },

  // ГОЛОВНІ УБОРИ
  { id: "241", name: "Головні убори", aliases: ["Кепки & Шапки"] },
  { id: "263", parentId: "241", name: "Дитяча кепка" },
  { id: "289", parentId: "241", name: "Панами" },
  { id: "302", parentId: "241", name: "Шапки" },
  { id: "226", parentId: "241", name: "Кепки" },

  // ІНСТРУМЕНТИ
  { id: "179", name: "Інструменти" },
  { id: "286", parentId: "179", name: "Викрутки" },
  { id: "250", parentId: "179", name: "Мультитули" },
  { id: "299", parentId: "179", name: "Набір інструментів" },
  { id: "267", parentId: "179", name: "Ножі" },
  { id: "180", parentId: "179", name: "Рулетки" },

  // ОФІС
  { id: "204", name: "Офіс", aliases: ["Офіс & Канцелярія"] },
  { id: "205", parentId: "204", name: "Записні книжки", aliases: ["Блокноти", "Щоденники"] },
  { id: "308", parentId: "204", name: "Календарі" },

  // ПЕРСОНАЛЬНІ АКСЕСУАРИ
  { id: "201", name: "Персональні аксессуари" },
  { id: "203", parentId: "201", name: "Брелки" },
  { id: "202", parentId: "201", name: "Візитниці" },
  { id: "306", parentId: "201", name: "Дзеркала" },

  // ДЛЯ ПРОФЕСІОНАЛІВ
  { id: "234", name: "Для професіоналів" },
  { id: "235", parentId: "234", name: "Опадоміри" },

  // ЕЛЕКТРОНІКА
  { id: "224", name: "Електроніка", aliases: ["Гаджети"] },
  { id: "281", parentId: "224", name: "Аксесуари" },
  { id: "298", parentId: "224", name: "Годинники" },
  { id: "251", parentId: "224", name: "Зарядні пристрої", aliases: ["Powerbanks", "Зарядки"] },
  { id: "279", parentId: "224", name: "Зволожувачі повітря" },
  { id: "297", parentId: "224", name: "Лампи" },
  { id: "258", parentId: "224", name: "Портативна акустика", aliases: ["Колонки", "Навушники"] },

  // ДІМ
  { id: "194", name: "Дім" },
  { id: "295", parentId: "194", name: "Дошки кухонні" },
  { id: "296", parentId: "194", name: "Кухонне приладдя" },
  { id: "309", parentId: "194", name: "Млини для спецій" },
  { id: "313", parentId: "194", name: "Набори для сиру" },
  { id: "257", parentId: "194", name: "Рушники" },
  { id: "311", parentId: "194", name: "Свічки" },
  { id: "301", parentId: "194", name: "Сковорідки" },
  { id: "310", parentId: "194", name: "Стакани" },
  { id: "294", parentId: "194", name: "Чайники" },
  { id: "237", parentId: "194", name: "Годівнички" },

  // ПОСУД
  { id: "230", name: "Посуд", aliases: ["Посуд & Напої"] },
  { id: "256", parentId: "230", name: "Горнятка", aliases: ["Чашки", "Бокали"] },

  // УПАКОВКА
  { id: "272", name: "Упаковка" },
  { id: "282", parentId: "272", name: "Подарункова коробка" },
  { id: "300", parentId: "272", name: "Подарунковий пакет" },
];

const ROOT_CATEGORIES = CATEGORIES_MAP.filter(c => !c.parentId && c.id !== 'discount' && c.id !== '270' && c.id !== '213');

function getCategoryIds(categoryName: string): string[] {
  const normalizedQuery = categoryName.toLowerCase().trim();
  const targetCategories = CATEGORIES_MAP.filter(c => 
    c.name.toLowerCase() === normalizedQuery || 
    c.aliases?.some(alias => alias.toLowerCase() === normalizedQuery)
  );
  if (targetCategories.length === 0) return [];
  let ids: string[] = [];
  targetCategories.forEach(target => {
      ids.push(target.id);
      const children = CATEGORIES_MAP.filter(c => c.parentId === target.id);
      children.forEach(child => ids.push(child.id));
  });
  return Array.from(new Set(ids));
}

// Компонент Sidebar
function CategorySidebar({ activeCategory }: { activeCategory: string | null }) {
    const [openCategories, setOpenCategories] = useState<string[]>([]);

    useEffect(() => {
        if (activeCategory) {
            const activeItem = CATEGORIES_MAP.find(c => c.name === activeCategory || c.aliases?.includes(activeCategory));
            if (activeItem && activeItem.parentId) {
                const parent = CATEGORIES_MAP.find(p => p.id === activeItem.parentId);
                if (parent) setOpenCategories(prev => [...prev, parent.name]);
            } else if (activeItem) {
                setOpenCategories(prev => [...prev, activeItem.name]);
            }
        }
    }, [activeCategory]);

    const toggleCategory = (name: string) => {
        setOpenCategories(prev => 
            prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
        );
    };

    return (
        <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Menu size={18}/> Категорії</h3>
            <div className="space-y-1">
                {ROOT_CATEGORIES.map(rootCat => {
                    const children = CATEGORIES_MAP.filter(c => c.parentId === rootCat.id);
                    const isOpen = openCategories.includes(rootCat.name);
                    const isActive = activeCategory === rootCat.name || (activeCategory && children.some(c => c.name === activeCategory));

                    return (
                        <div key={rootCat.id} className="border-b border-white/5 last:border-0">
                            <div className="flex items-center justify-between py-2 group">
                                <Link 
                                    href={`/catalog?category=${rootCat.name}`}
                                    className={`text-sm font-bold uppercase transition flex-1 ${isActive ? 'text-blue-400' : 'text-gray-300 hover:text-white'}`}
                                >
                                    {rootCat.name}
                                </Link>
                                {children.length > 0 && (
                                    <button onClick={() => toggleCategory(rootCat.name)} className="p-1 text-gray-500 hover:text-white transition">
                                        {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                    </button>
                                )}
                            </div>
                            {isOpen && children.length > 0 && (
                                <div className="pl-3 pb-2 space-y-1 border-l border-white/10 ml-1">
                                    {children.map(child => (
                                        <Link 
                                            key={child.id}
                                            href={`/catalog?category=${child.name}`}
                                            className={`block text-xs py-1 transition ${activeCategory === child.name ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            {child.name}
                                        </Link>
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

// === ОНОВЛЕНИЙ КОМПОНЕНТ ФІЛЬТРІВ ===
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

    if (newSelected.length > 0) {
      current.set(paramName, newSelected.join(","));
    } else {
      current.delete(paramName);
    }

    current.set("page", "1");

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
                <Search size={12} className="absolute right-2 top-1.5 text-gray-500"/>
             </div>
          )}
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {filteredItems.map((item, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                <div className={`relative w-4 h-4 border rounded flex items-center justify-center transition ${selectedItems.includes(item) ? 'border-blue-500 bg-blue-500' : 'border-white/20 group-hover:border-blue-500'}`}>
                  <input 
                    type="checkbox" 
                    className="peer appearance-none w-full h-full absolute inset-0 cursor-pointer"
                    checked={selectedItems.includes(item)}
                    onChange={() => handleToggle(item)}
                  />
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
  
  const page = parseInt(searchParams.get("page") || "1");
  const query = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category"); 
  
  const colorParam = searchParams.get("color");
  const materialParam = searchParams.get("material");
  const genderParam = searchParams.get("gender");

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Додаємо state для кошика та авторизації
  const { addToCart, totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [session, setSession] = useState<any>(null);

  const COLORS = ["Білий", "Чорний", "Сірий", "Синій", "Червоний", "Зелений", "Жовтий", "Оранжевий", "Коричневий", "Фіолетовий", "Бежевий", "Рожевий"];
  const MATERIALS = ["Бавовна", "Поліестер", "Еластан", "Фліс", "Метал", "Пластик", "Кераміка", "Скло", "Дерево", "Шкіра"];
  const GENDER = ["Чоловічий", "Жіночий", "Унісекс", "Дитячий"];

  // Перевірка сесії
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  useEffect(() => {
    fetchData();
  }, [page, query, categoryParam, colorParam, materialParam, genderParam]);

  async function fetchData() {
    setLoading(true);
    let request = supabase.from("products").select("*");

    if (query) {
        request = request.ilike("title", `%${query}%`);
    }

    if (categoryParam) {
        const categoryIds = getCategoryIds(categoryParam);
        if (categoryIds.length > 0) {
            request = request.in("category_external_id", categoryIds);
        } else {
            console.warn("Категорія не знайдена, показуємо все");
        }
    }

    if (colorParam) {
        const colors = colorParam.split(",");
        request = request.in('color', colors);
    }

    if (materialParam) {
        const materials = materialParam.split(",");
        const orQuery = materials.map(m => `description.ilike.%${m}%`).join(",");
        request = request.or(orQuery);
    }

    if (genderParam) {
        const genders = genderParam.split(",");
        const orQuery = genders.map(g => `description.ilike.%${g}%`).join(",");
        request = request.or(orQuery);
    }

    const from = (page - 1) * 500; 
    const to = from + 499;

    const { data, error } = await request.range(from, to).order("id", { ascending: false });

    if (error) {
        console.error("Error:", error);
        setLoading(false);
        return;
    }

    if (!data) { setLoading(false); return; }

    const groupedMap = new Map();

    data.forEach((item) => {
        const rawTitle = item.title || item.description || "Товар без назви";
        const groupKey = rawTitle.trim(); 

        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
                ...item,
                title: rawTitle,
                variants: [item],
                variant_images: item.image_url ? [item.image_url] : [],
                stock_total: item.amount || 0,
                stock_reserve: item.reserve || 0,
                active_image: item.image_url 
            });
        } else {
            const group = groupedMap.get(groupKey);
            group.variants.push(item);
            if (item.image_url && !group.variant_images.includes(item.image_url)) {
                group.variant_images.push(item.image_url);
            }
            group.stock_total += (item.amount || 0);
            group.stock_reserve += (item.reserve || 0);
        }
    });

    const groupedProducts = Array.from(groupedMap.values()).map(group => ({
        ...group,
        stock_free: group.stock_total - group.stock_reserve,
        article: group.sku ? group.sku.split('-')[0] : `ART-${group.id}`,
        brand: "Totobi Partner" 
    }));

    setProducts(groupedProducts);
    setLoading(false);
  }

  const pageTitle = categoryParam || (query ? `Пошук: "${query}"` : "Всі товари");

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

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans">
      
      {/* HEADER (Замінили на компонент) */}
      <Header 
        onCartClick={() => setIsCartOpen(true)} 
        cartCount={totalItems} 
        onLogout={handleLogout}
        onMobileMenuClick={() => {}}
      />

      {/* BREADCRUMBS & TITLE */}
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
         <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
             <Link href="/" className="hover:text-white">Головна</Link> / <span className="text-white">Каталог</span>
             {categoryParam && <> / <span className="text-blue-400">{categoryParam}</span></>}
         </div>
         <h1 className="text-3xl font-black uppercase text-white">{pageTitle}</h1>
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

        {/* PRODUCTS GRID */}
        <div className="flex-1">
           <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-[#1a1a1a] p-3 rounded-xl border border-white/5">
              <div className="flex gap-1 text-sm font-bold overflow-x-auto w-full md:w-auto">
                 <button onClick={() => router.push('/catalog')} className={`px-4 py-2 rounded-lg transition ${!categoryParam ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/10'}`}>Всі товари</button>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-widest mr-4">Знайдено {products.length} товарів</span>
           </div>

           {products.length === 0 && !loading ? (
               <div className="text-center py-20 bg-[#1a1a1a] rounded-xl border border-white/5">
                   <div className="inline-flex bg-white/5 p-4 rounded-full mb-4"><Search size={32} className="text-gray-500"/></div>
                   <h3 className="text-xl font-bold mb-2">Товарів не знайдено</h3>
                   <p className="text-gray-400 mb-6">Спробуйте змінити фільтри або категорію</p>
                   <Link href="/catalog" className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Показати всі товари</Link>
               </div>
           ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                 {loading ? [...Array(8)].map((_, i) => <div key={i} className="h-96 bg-[#1a1a1a] rounded-xl animate-pulse"></div>) : 
                   products.map((item) => (
                     <div key={item.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 hover:border-blue-500/30 hover:shadow-2xl transition group flex gap-3 h-full relative">
                       
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
                               <ProductImage 
                                 src={item.active_image || item.image_url} 
                                 alt={item.title}
                                 fill
                                 className="group-hover:scale-105 transition duration-500"
                               />
                             </Link>
                             <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                 {item.stock_free > 0 && <div className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">В наявності</div>}
                             </div>
                          </div>

                          <div className="mb-2">
                             <Link href={`/product/${item.id}`} className="font-bold text-sm leading-tight text-gray-100 hover:text-blue-400 transition line-clamp-2 mb-1" title={item.title}>{item.title}</Link>
                             <div className="flex justify-between text-[10px] text-gray-500 mt-1"><span>Арт: {item.article}</span><span className="text-zinc-400">{item.brand}</span></div>
                          </div>

                          <div className="text-xl font-bold text-white mb-3">
                             {item.price > 0 ? (
                                 <>{item.price} <span className="text-xs font-normal text-gray-400">ГРН</span></>
                             ) : (
                                 <span className="text-sm text-blue-400">Ціна за запитом</span>
                             )}
                          </div>

                          {/* === ДОДАНО: Відображення залишку === */}
                          <div className="mb-2 text-xs">
                            {item.stock_free > 0 ? (
                                <span className="text-green-400 font-bold flex items-center gap-1"><Check size={12}/> Вільний залишок: {item.stock_free} шт.</span>
                            ) : (
                                <span className="text-red-400 font-bold flex items-center gap-1"><X size={12}/> Немає в наявності</span>
                            )}
                          </div>
                          {/* === КІНЕЦЬ ЗМІН === */}

                          <div className="mt-auto bg-[#111] rounded p-2 text-[10px] space-y-1 border border-white/5">
                             <div className="flex justify-between">
                                <span className="text-gray-400">На складі:</span>
                                <span className="font-bold text-white">{item.stock_total || 0}</span>
                             </div>
                          </div>

                          <button onClick={() => handleAddToCart(item)} className="mt-2 w-full bg-white text-black font-bold py-2 rounded hover:bg-blue-600 hover:text-white transition text-sm flex items-center justify-center gap-2">
                             В кошик
                          </button>

                       </div>
                     </div>
                   ))
                 }
               </div>
           )}
        </div>
      </main>

      {/* CART DRAWER */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen text-white p-10 flex items-center justify-center">Завантаження каталогу...</div>}>
      <CatalogContent />
    </Suspense>
  );
}