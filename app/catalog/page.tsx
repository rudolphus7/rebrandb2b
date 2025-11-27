"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  Search, ArrowLeft, ArrowRight, Filter, ChevronDown, 
  ChevronUp, Check, Home as HomeIcon, Package
} from "lucide-react";
// Імпортуємо наш новий компонент картинки
import ProductImage from "../components/ProductImage";

function FilterGroup({ title, items, isOpenDefault = false }: { title: string, items: string[], isOpenDefault?: boolean }) {
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [search, setSearch] = useState("");
  const filteredItems = items.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="border-b border-white/10 py-4">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-sm font-bold uppercase tracking-wider mb-2 hover:text-blue-400 transition">
        {title} {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>
      {isOpen && (
        <div className="mt-2">
          <div className="relative mb-3">
             <input type="text" placeholder="Пошук..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#222] border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"/>
             <Search size={12} className="absolute right-2 top-1.5 text-gray-500"/>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {filteredItems.map((item, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative w-4 h-4 border border-white/20 rounded flex items-center justify-center group-hover:border-blue-500 transition">
                  <input type="checkbox" className="peer appearance-none w-full h-full absolute inset-0 cursor-pointer"/>
                  <Check size={10} className="text-blue-500 opacity-0 peer-checked:opacity-100 transition"/>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-white transition">{item}</span>
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
  
  const page = parseInt(searchParams.get("page") || "1");
  const query = searchParams.get("q") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ["Білий", "Чорний", "Сірий", "Синій", "Червоний", "Зелений", "Жовтий", "Оранжевий"];
  const MATERIALS = ["Бавовна", "Поліестер", "Еластан", "Фліс"];
  const GENDER = ["Чоловічий", "Жіночий", "Унісекс", "Дитячий"];

  useEffect(() => {
    fetchData();
  }, [page, query]);

  async function fetchData() {
    setLoading(true);
    let request = supabase.from("products").select("*");

    if (query) request = request.ilike("title", `%${query}%`);

    const from = (page - 1) * 500; 
    const to = from + 499;

    const { data } = await request.range(from, to).order("title", { ascending: true });

    if (!data) { setLoading(false); return; }

    const groupedMap = new Map();

    data.forEach((item) => {
        const groupKey = item.title.trim(); 

        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, {
                ...item,
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

  // При наведенні мишки ми просто оновлюємо state або DOM, 
  // але оскільки ProductImage - це React компонент, краще просто дозволити перехід на картку.
  // (Пряма маніпуляція DOM тут може бути складною через обгортку, тому поки спростимо)

  return (
    <div className="min-h-screen bg-[#111] text-white font-sans">
      
      <header className="sticky top-0 z-40 bg-[#111]/95 backdrop-blur border-b border-white/10 py-4">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 flex items-center justify-between gap-6">
           <Link href="/" className="flex items-center gap-2 text-xl font-black italic tracking-tighter">REBRAND</Link>
           <div className="flex-1 max-w-3xl relative hidden md:block">
             <input type="text" placeholder="Шукати товари..." defaultValue={query} className="w-full bg-white text-black rounded-lg py-2.5 pl-4 pr-12 focus:outline-none font-medium"/>
             <Search size={20} className="absolute right-4 top-2.5 text-gray-500"/>
           </div>
           <div className="flex gap-4">
             <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-bold uppercase"><HomeIcon size={16}/> Головна</Link>
           </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4 text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2">
         <Link href="/" className="hover:text-white">Головна</Link> / <span className="text-white">Каталог</span>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pb-20 flex gap-8 items-start">
        
        {/* SIDEBAR */}
        <aside className="w-64 flex-shrink-0 hidden lg:block bg-[#1a1a1a] rounded-xl border border-white/5 p-4 sticky top-24">
           <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Filter size={18}/> Фільтри</h3>
           <FilterGroup title="Група кольорів" items={COLORS} isOpenDefault={true} />
           <FilterGroup title="Матеріал" items={MATERIALS} isOpenDefault={true} />
           <FilterGroup title="Стать" items={GENDER} />
        </aside>

        {/* PRODUCTS */}
        <div className="flex-1">
           <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-[#1a1a1a] p-3 rounded-xl border border-white/5">
              <div className="flex gap-1 text-sm font-bold overflow-x-auto w-full md:w-auto">
                 <button className="px-4 py-2 bg-white text-black rounded-lg">Всі товари</button>
                 <button className="px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">Новинки</button>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-widest mr-4">Показано {products.length} моделей</span>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
             {loading ? (
                [...Array(8)].map((_, i) => <div key={i} className="h-96 bg-[#1a1a1a] rounded-xl animate-pulse"></div>)
             ) : (
                products.map((item) => (
                  <div key={item.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 hover:border-blue-500/30 hover:shadow-2xl transition group flex gap-3 h-full relative">
                     
                     {/* ЗЛІВА: ВАРІАНТИ (СВОТЧІ) */}
                     <div className="flex flex-col gap-2 w-10 flex-shrink-0 pt-2 z-10">
                        {item.variant_images.length > 0 ? (
                            item.variant_images.slice(0, 6).map((img: string, idx: number) => (
                            <div 
                                key={idx} 
                                className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-white cursor-pointer relative bg-black transition hover:scale-110"
                            >
                                {/* ВИКОРИСТОВУЄМО ProductImage */}
                                <ProductImage src={img} alt="Color" fill />
                            </div>
                            ))
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[8px] text-zinc-500">N/A</div>
                        )}
                        
                        {item.variant_images.length > 6 && (
                            <div className="text-[10px] text-gray-500 text-center font-bold">+{item.variant_images.length - 6}</div>
                        )}
                     </div>

                     {/* ЦЕНТР: ІНФО */}
                     <div className="flex-1 flex flex-col min-w-0">
                        {/* ФОТО */}
                        <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden mb-3 relative">
                           <Link href={`/product/${item.id}`} className="block w-full h-full">
                             {/* ВИКОРИСТОВУЄМО ProductImage */}
                             <ProductImage 
                                src={item.active_image || item.image_url} 
                                alt={item.title}
                                fill
                                className="group-hover:scale-105 transition duration-500"
                             />
                           </Link>
                           
                           <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                               {item.stock_free > 100 && <div className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Є на складі</div>}
                               <div className="bg-orange-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded">Єдина ціна</div>
                           </div>
                        </div>

                        {/* ТЕКСТ */}
                        <div className="mb-2">
                           <Link href={`/product/${item.id}`} className="font-bold text-sm leading-tight text-gray-100 hover:text-blue-400 transition line-clamp-2 mb-1" title={item.title}>
                             {item.title}
                           </Link>
                           <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                              <span>Арт: {item.article}</span>
                              <span className="text-zinc-400">{item.brand}</span>
                           </div>
                        </div>

                        <div className="text-xl font-bold text-white mb-3">
                           {item.price > 0 ? (
                               <>{item.price} <span className="text-xs font-normal text-gray-400">ГРН</span></>
                           ) : (
                               <span className="text-sm text-blue-400">Ціна за запитом</span>
                           )}
                        </div>

                        {/* ЗАЛИШКИ */}
                        <div className="mt-auto bg-[#111] rounded p-2 text-[10px] space-y-1 border border-white/5">
                           <div className="flex justify-between">
                              <span className="text-gray-400">На складі:</span>
                              <span className="font-bold text-white">{item.stock_total}</span>
                           </div>
                           <div className="flex justify-between border-b border-white/5 pb-1">
                              <span className="text-gray-400">Вільний залишок:</span>
                              <span className="font-bold text-green-400">{item.stock_free}</span>
                           </div>
                           <div className="flex justify-between pt-1">
                              <span className="text-gray-400">На дату:</span>
                              <span className="font-bold text-gray-500">оновлено</span>
                           </div>
                        </div>

                     </div>
                  </div>
                ))
             )}
           </div>
        </div>
      </main>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen text-white p-10">Завантаження...</div>}>
      <CatalogContent />
    </Suspense>
  );
}