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

// --- 1. ВАША СТРУКТУРА МЕНЮ ТА ПРАВИЛА ПОШУКУ ---
// keywords: слова, за якими ми визначаємо категорію.
// exclude: слова, яких НЕ має бути (щоб Поло не потрапило у футболки).

const CATEGORY_STRUCTURE = [
  {
    name: "Сумки",
    subcategories: [
      { name: "Валізи", keywords: ["валіза", "чемодан", "suitcase", "trolley"] },
      { name: "Косметички", keywords: ["косметич", "несесер", "toiletry"] },
      { name: "Мішок спортивний", keywords: ["мішок", "gymsac", "drawstring"] },
      { name: "Рюкзаки", keywords: ["рюкзак", "backpack"] },
      { name: "Сумки для ноутбуків", keywords: ["ноутбук", "laptop", "портфель", "document"] },
      { name: "Сумки для покупок", keywords: ["шопер", "shopper", "покупок", "totebag", "tote"] },
      { name: "Сумки дорожні та спортивні", keywords: ["дорожня", "спортивна", "duffel", "travel bag", "sport bag"] },
      { name: "Сумки на пояс", keywords: ["пояс", "бананка", "waist", "belt bag"] },
      { name: "Термосумки", keywords: ["термосумка", "холодильник", "cooler bag"] },
    ]
  },
  {
    name: "Ручки",
    subcategories: [
      { name: "Еко ручки", keywords: ["еко ручк", "папер", "бамбук", "дерев'ян", "eco pen", "bamboo"] },
      { name: "Металеві ручки", keywords: ["метал", "metal pen", "алюмін"] },
      { name: "Олівці", keywords: ["олівець", "pencil", "набір олівців"] },
      { name: "Пластикові ручки", keywords: ["пластик", "plastic pen"], exclude: ["еко"] },
    ]
  },
  {
    name: "Подорож та відпочинок",
    subcategories: [
      { name: "Все для пікніка", keywords: ["пікнік", "picnic", "барбекю", "bbq"] },
      { name: "Ліхтарики", keywords: ["ліхтар", "torch", "flashlight", "light"] },
      { name: "Ланч бокси", keywords: ["ланч", "lunch", "контейнер", "box"] },
      { name: "Лопати", keywords: ["лопата"] },
      { name: "Пледи", keywords: ["плед", "blanket"] },
      { name: "Пляшки для пиття", keywords: ["пляшка", "bottle", "бідон"] },
      { name: "Подушки", keywords: ["подушк", "pillow"] },
      { name: "Термоси та термокружки", keywords: ["термос", "thermos", "термокружк", "tumbler", "mug", "чашка"] },
      { name: "Фляги", keywords: ["фляга", "hip flask"] },
      { name: "Фрізбі", keywords: ["фрізбі", "frisbee", "літаюч"] },
      { name: "Штопори", keywords: ["штопор", "відкривач", "opener", "corkscrew"] },
    ]
  },
  {
    name: "Парасолі",
    subcategories: [
      { name: "Парасолі складні", keywords: ["парасоля", "umbrella"], exclude: ["тростина", "golf", "stick"] },
      { name: "Парасолі-тростини", keywords: ["тростина", "golf", "stick umbrella"] },
    ]
  },
  {
    name: "Одяг",
    subcategories: [
      { name: "Вітровки", keywords: ["вітровка", "windbreaker", "дощовик"] },
      { name: "Рукавички", keywords: ["рукавич", "glove"] },
      { name: "Спортивний одяг", keywords: ["спорт", "sport", "лосини", "легінси"] },
      { name: "Поло", keywords: ["поло", "polo"] }, // Поло йде перед футболками, це важливо
      { name: "Футболки", keywords: ["футболк", "t-shirt", "майка"], exclude: ["поло", "polo"] },
      { name: "Дитячий одяг", keywords: ["дитяч", "kids", "kid"] },
      { name: "Реглани, фліси", keywords: ["реглан", "фліс", "fleece", "худі", "hoodie", "світшот", "sweatshirt", "толстовка"] },
      { name: "Жилети", keywords: ["жилет", "vest", "bodywarmer"] },
      { name: "Куртки та софтшели", keywords: ["куртка", "jacket", "softshell", "софтшел", "парка"] },
    ]
  },
  {
    name: "Головні убори",
    subcategories: [
      { name: "Дитяча кепка", keywords: ["дитяч", "kids"], extraCheck: "кепка" },
      { name: "Панами", keywords: ["панама", "bucket"] },
      { name: "Шапки", keywords: ["шапк", "beanie", "зим"] },
      { name: "Кепки", keywords: ["кепка", "cap", "бейсболк"], exclude: ["дитяч", "kids"] },
    ]
  },
  {
    name: "Інструменти",
    subcategories: [
      { name: "Викрутки", keywords: ["викрутк", "screwdriver"] },
      { name: "Мультитули", keywords: ["мультитул", "multitool"] },
      { name: "Набір інструментів", keywords: ["набір інструмент", "tool set"] },
      { name: "Ножі", keywords: ["ніж", "knife"] },
      { name: "Рулетки", keywords: ["рулетк", "tape"] },
    ]
  },
  {
    name: "Офіс",
    subcategories: [
      { name: "Записні книжки", keywords: ["блокнот", "notebook", "нотатник", "щоденник"] },
      { name: "Календарі", keywords: ["календар"] },
    ]
  },
  {
    name: "Персональні аксессуари",
    subcategories: [
      { name: "Брелки", keywords: ["брелок", "keychain", "keyring"] },
      { name: "Візитниці", keywords: ["візитниц", "card holder"] },
      { name: "Дзеркала", keywords: ["дзеркал", "mirror"] },
    ]
  },
  {
    name: "Електроніка",
    subcategories: [
      { name: "Зарядні пристрої", keywords: ["повербанк", "powerbank", "зарядн", "charger", "cable", "кабель"] },
      { name: "Зволожувачі повітря", keywords: ["зволожувач", "humidifier"] },
      { name: "Лампи", keywords: ["лампа", "lamp"] },
      { name: "Портативна акустика", keywords: ["колонка", "speaker", "навушники"] },
      { name: "Аксесуари", keywords: ["usb", "hub", "хаб"] },
      { name: "Годинники", keywords: ["годинник", "watch", "clock"] },
    ]
  },
  {
    name: "Дім",
    subcategories: [
      { name: "Дошки кухонні", keywords: ["дошка", "board"] },
      { name: "Кухонне приладдя", keywords: ["кухонн", "kitchen", "фартух"] },
      { name: "Млини для спецій", keywords: ["млин", "mill", "salt", "pepper"] },
      { name: "Набори для сиру", keywords: ["сир", "cheese"] },
      { name: "Рушники", keywords: ["рушник", "towel"] },
      { name: "Свічки", keywords: ["свічк", "candle"] },
      { name: "Сковорідки", keywords: ["сковорід", "pan"] },
      { name: "Стакани", keywords: ["стакан", "glass"] },
      { name: "Чайники", keywords: ["чайник", "teapot"] },
      { name: "Годівнички", keywords: ["годівничк", "bird"] },
    ]
  },
  {
    name: "Посуд",
    subcategories: [
      { name: "Горнятка", keywords: ["горнятк", "mug", "чашка", "керамічн"], exclude: ["термо"] }, // Щоб термокружки не лізли сюди
    ]
  },
  {
    name: "Упаковка",
    subcategories: [
      { name: "Подарункова коробка", keywords: ["коробк", "box", "case"] },
      { name: "Подарунковий пакет", keywords: ["пакет", "bag", "paper"] },
    ]
  },
];

// --- ДОПОМІЖНІ ФУНКЦІЇ ---

// Функція, яка визначає категорію товару за його текстом
const detectCategory = (item: any) => {
  // Збираємо весь текст про товар в одну купу
  const text = `${item.title} ${item.description || ''} ${item.category || ''}`.toLowerCase();
  
  for (const mainCat of CATEGORY_STRUCTURE) {
    for (const subCat of mainCat.subcategories) {
      // 1. Перевіряємо виключення (якщо є слово "поло", то це не "футболка")
      if (subCat.exclude && subCat.exclude.some(badWord => text.includes(badWord))) {
        continue; 
      }
      
      // 2. Додаткова перевірка (для дитячих кепок: має бути і "дитяч", і "кепка")
      if ((subCat as any).extraCheck && !text.includes((subCat as any).extraCheck)) {
        continue;
      }

      // 3. Перевіряємо ключові слова
      if (subCat.keywords.some(keyword => text.includes(keyword))) {
        return { 
          main: mainCat.name, 
          sub: subCat.name 
        };
      }
    }
  }
  return { main: "Інше", sub: "Інше" };
};

const getCleanTitle = (title: string) => {
    if (!title) return "unknown";
    // Видаляємо кольори з назви для групування
    const cleanup = title.replace(/\b(Red|Blue|Black|White|Grey|Green|Yellow|Orange|Purple|Pink|Navy|Royal|Apple|Lime|French|Classic|Ladies|Men|Kids)\b/gi, '').trim();
    // Видаляємо зайві символи в кінці
    return cleanup.replace(/[\s\-_]+$/, '');
};


// --- UI КОМПОНЕНТИ ---

function CategorySidebar({ activeMain, activeSub, onSelect }: { activeMain: string | null, activeSub: string | null, onSelect: (main: string, sub: string | null) => void }) {
    const [openCategories, setOpenCategories] = useState<string[]>([]);

    useEffect(() => {
        if (activeMain && !openCategories.includes(activeMain)) {
            setOpenCategories(prev => [...prev, activeMain]);
        }
    }, [activeMain]);

    const toggleCategory = (name: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenCategories(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
    };

    return (
        <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Menu size={18}/> Категорії</h3>
            <div className="space-y-1">
                {CATEGORY_STRUCTURE.map(rootCat => {
                    const isOpen = openCategories.includes(rootCat.name);
                    const isActive = activeMain === rootCat.name;

                    return (
                        <div key={rootCat.name} className="border-b border-white/5 last:border-0">
                            <div 
                                className={`flex items-center justify-between py-2 px-2 rounded cursor-pointer transition ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                onClick={(e) => {
                                   toggleCategory(rootCat.name, e);
                                   // Якщо клікаємо на головну категорію - обираємо її
                                   onSelect(rootCat.name, null); 
                                }}
                            >
                                <span className={`text-sm font-bold uppercase flex-1 ${isActive ? 'text-blue-400' : 'text-gray-300'}`}>
                                    {rootCat.name}
                                </span>
                                <button className="p-1 text-gray-500 hover:text-white transition">
                                    {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                            </div>
                            
                            {isOpen && (
                                <div className="pl-4 pb-2 space-y-1 border-l-2 border-white/10 ml-2 mt-1">
                                    {rootCat.subcategories.map(child => {
                                         const isChildActive = activeSub === child.name;
                                         return (
                                            <button 
                                                key={child.name}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelect(rootCat.name, child.name);
                                                }}
                                                className={`block w-full text-left text-xs py-1.5 transition ${isChildActive ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {child.name}
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
  
  // Константи
  const COLORS = ["Білий", "Чорний", "Сірий", "Синій", "Червоний", "Зелений", "Жовтий", "Оранжевий", "Коричневий", "Фіолетовий", "Бежевий", "Рожевий"];
  const MATERIALS = ["Бавовна", "Поліестер", "Еластан", "Фліс", "Метал", "Пластик", "Кераміка", "Скло", "Дерево", "Шкіра"];
  const GENDER = ["Чоловічий", "Жіночий", "Унісекс", "Дитячий"];

  // Стейт
  const [allProducts, setAllProducts] = useState<any[]>([]); // Всі завантажені
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]); // Відфільтровані для показу
  const [loading, setLoading] = useState(true);
  
  // Фільтри стейт (локальний, щоб не дьоргати URL постійно)
  const [selectedMainCat, setSelectedMainCat] = useState<string | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { addToCart, totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // 1. ЗАВАНТАЖЕННЯ ВСІХ ТОВАРІВ (Один раз при вході)
  useEffect(() => {
    async function loadAll() {
        setLoading(true);
        // Вантажимо взагалі все. Так, це 4800 записів, але тексту там небагато, це буде десь 2-3Мб JSON.
        // Зате ми зможемо ідеально посортувати на клієнті.
        const { data, error } = await supabase.from("products").select("*");
        
        if (error || !data) {
            console.error("Error loading products", error);
            setLoading(false);
            return;
        }

        // 2. ОБРОБКА ТА МАПІНГ (The Magic)
        const processed = data.map((item: any) => {
            // Визначаємо нашу "віртуальну" категорію
            const { main, sub } = detectCategory(item);
            
            return {
                ...item,
                virtualMainCategory: main,
                virtualSubCategory: sub,
                // Підчищаємо для групування
                cleanTitle: getCleanTitle(item.title),
                baseSku: item.sku ? item.sku.split(/[\s\-_./\\]+/)[0] : `ID-${item.id}`
            };
        });

        // 3. ГРУПУВАННЯ ПО КОЛЬОРАХ
        const groupedMap = new Map();
        processed.forEach((item: any) => {
            // Ключ групи: SKU + Category (щоб не змішати різні товари з однаковим артикулом)
            const groupKey = `${item.baseSku}-${item.virtualSubCategory}`;
            
            if (!groupedMap.has(groupKey)) {
                groupedMap.set(groupKey, {
                    ...item,
                    variants: [item],
                    variant_images: item.image_url ? [item.image_url] : [],
                    stock_total: item.amount || 0,
                    stock_reserve: item.reserve || 0,
                    in_stock: (item.in_stock || false) || ((item.amount || 0) > 0)
                });
            } else {
                const group = groupedMap.get(groupKey);
                // Додаємо варіант
                group.variants.push(item);
                // Додаємо картинку
                if (item.image_url && !group.variant_images.includes(item.image_url)) {
                    group.variant_images.push(item.image_url);
                }
                // Сумуємо залишки
                group.stock_total += (item.amount || 0);
                group.stock_reserve += (item.reserve || 0);
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

  // 4. ФІЛЬТРАЦІЯ НА ЛЬОТУ
  useEffect(() => {
    if (loading) return;

    let result = allProducts;

    // Фільтр по категоріях
    if (selectedMainCat) {
        result = result.filter(p => p.virtualMainCategory === selectedMainCat);
    }
    if (selectedSubCat) {
        result = result.filter(p => p.virtualSubCategory === selectedSubCat);
    }

    // Фільтр по пошуку
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(p => 
            p.title.toLowerCase().includes(q) || 
            p.sku?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        );
    }

    // Фільтр по кольорах
    if (selectedColors.length > 0) {
        result = result.filter(p => selectedColors.includes(p.color));
    }

    setDisplayedProducts(result);

  }, [selectedMainCat, selectedSubCat, searchQuery, selectedColors, allProducts, loading]);


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

  const handleSelectCategory = (main: string, sub: string | null) => {
      setSelectedMainCat(main);
      setSelectedSubCat(sub);
      // Скрол вгору при виборі категорії
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleColor = (color: string) => {
      setSelectedColors(prev => 
          prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
      );
  };

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans">
      <Header onCartClick={() => setIsCartOpen(true)} cartCount={totalItems} onLogout={handleLogout} />

      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
         <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
             <Link href="/" className="hover:text-white">Головна</Link> / 
             <span className="text-white cursor-pointer" onClick={() => {setSelectedMainCat(null); setSelectedSubCat(null);}}>Каталог</span>
             {selectedMainCat && <> / <span className="text-blue-400">{selectedMainCat}</span></>}
             {selectedSubCat && <> / <span className="text-gray-300">{selectedSubCat}</span></>}
         </div>
         
         {/* Пошук зверху */}
         <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
             <h1 className="text-3xl font-black uppercase text-white">
                 {selectedSubCat || selectedMainCat || "Всі товари"}
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
           {(selectedMainCat || searchQuery || selectedColors.length > 0) && (
              <button 
                onClick={() => {setSelectedMainCat(null); setSelectedSubCat(null); setSearchQuery(""); setSelectedColors([]);}} 
                className="text-xs text-red-400 flex items-center gap-1 hover:underline mb-4 w-full text-left"
              >
                  <X size={12}/> Скинути фільтри
              </button>
           )}
           
           <CategorySidebar activeMain={selectedMainCat} activeSub={selectedSubCat} onSelect={handleSelectCategory} />
           
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
                       {/* Color Dots */}
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
                       
                       {/* Info */}
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