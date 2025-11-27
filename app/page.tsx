"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link"; 
import LoginPage from "./components/LoginPage"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ShoppingBag, LogOut, User, X, ArrowRight, ArrowLeft,
  Menu, LayoutGrid, Star, ShieldCheck, Zap, Truck, Package, Heart, 
  Flame, Percent, Sparkles, ChevronRight
} from "lucide-react";

// --- ДАНІ ДЛЯ МЕГА-МЕНЮ (КАТАЛОГ) ---
const CATALOG_MENU = [
  {
    category: "Одяг & Текстиль",
    items: ["Футболки", "Худі & Світшоти", "Поло", "Кепки & Шапки", "Жилетки & Куртки", "Фліс"]
  },
  {
    category: "Офіс & Канцелярія",
    items: ["Блокноти", "Ручки металеві", "Ручки пластикові", "Щоденники", "Папки", "Ланьярди"]
  },
  {
    category: "Посуд & Напої",
    items: ["Термочашки", "Пляшки для води", "Керамічні чашки", "Термоси", "Бокали"]
  },
  {
    category: "Сумки & Рюкзаки",
    items: ["Шопери (Еко-сумки)", "Рюкзаки для ноутбуків", "Спортивні сумки", "Бананки", "Косметички"]
  },
  {
    category: "Гаджети",
    items: ["Powerbanks", "USB-флешки", "Колонки", "Бездротові зарядки", "Навушники"]
  },
  {
    category: "Дім & Відпочинок",
    items: ["Пледи", "Парасолі", "Інструменти", "Ланчбокси", "Ігри"]
  }
];

// --- ДАНІ ДЛЯ БАНЕРІВ ---
const DEFAULT_SLIDES = [
  {
    id: 999,
    title: "НОВА КОЛЕКЦІЯ",
    subtitle: "WINTER 2025",
    description: "Оверсайз худі з преміум бавовни. Ідеально під нанесення.",
    image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: 1000,
    title: "КОРПОРАТИВНИЙ",
    subtitle: "МЕРЧ",
    description: "Одягніть команду в якість. Знижки для B2B до -30%.",
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2000&auto=format&fit=crop",
  }
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  
  // Дані
  const [products, setProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // UI Стани
  const [cart, setCart] = useState<any[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false); // <--- СТАН ДЛЯ МЕГА-МЕНЮ
  const [currentSlide, setCurrentSlide] = useState(0);

  // Ініціалізація
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchContent();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchContent();
    });

    const timer = setInterval(() => { nextSlide(); }, 6000);
    return () => { subscription.unsubscribe(); clearInterval(timer); };
  }, [currentSlide, banners.length]);

  async function fetchContent() {
    const { data: prodData } = await supabase.from("products").select("*").order('id', { ascending: false });
    if (prodData) setProducts(prodData);

    const { data: bannerData } = await supabase.from("banners").select("*").order('id', { ascending: false });
    if (bannerData && bannerData.length > 0) setBanners(bannerData); else setBanners(DEFAULT_SLIDES);
  }

  // --- ЛОГІКА СЛАЙДЕРА ---
  const activeBanners = banners.length > 0 ? banners : DEFAULT_SLIDES;
  const nextSlide = () => { setCurrentSlide((prev) => (prev === activeBanners.length - 1 ? 0 : prev + 1)); };
  const prevSlide = () => { setCurrentSlide((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1)); };

  // --- ЛОГІКА КОШИКА ---
  function addToCart(product: any) { setCart([...cart, product]); setIsCartOpen(true); }
  function removeFromCart(indexToRemove: number) { setCart(cart.filter((_, index) => index !== indexToRemove)); }
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  async function placeOrder() {
    if (cart.length === 0) return alert("Кошик порожній!");
    setIsOrdering(true);
    const { error } = await supabase.from('orders').insert([{ user_email: session.user.email, total_price: totalPrice, items: cart }]);
    if (!error) {
      try { await fetch('/api/telegram', { method: 'POST', body: JSON.stringify({ email: session.user.email, total: totalPrice, items: cart }) }); } catch (e) {}
      alert("Замовлення прийнято!"); setCart([]); setIsOrdering(false); setIsCartOpen(false);
    } else { alert(error.message); setIsOrdering(false); }
  }

  async function handleLogin(e: string, p: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) alert(error.message);
  }

  async function handleLogout() { await supabase.auth.signOut(); setProducts([]); setCart([]); }

  if (!session) return <LoginPage onLogin={handleLogin} />;

  const currentBanner = activeBanners[currentSlide];

  return (
    <div className="min-h-screen bg-[#111111] text-white font-sans flex flex-col">
      
      {/* === HEADER (Sticky) === */}
      <header className="sticky top-0 z-50 bg-[#111111] border-b border-white/10 shadow-xl">
        <div className="relative z-50 bg-[#111111] py-4"> {/* Верхній шар хедера */}
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center justify-between gap-6">
            
            {/* ЛОГО + КНОПКА КАТАЛОГУ */}
            <div className="flex items-center gap-6 flex-shrink-0">
              <div 
                className="text-2xl font-black italic tracking-tighter cursor-pointer select-none"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                REBRAND
              </div>
              
              {/* КНОПКА ВІДКРИТТЯ МЕГА-МЕНЮ */}
              <button 
                onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                className={`hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition duration-200 border
                  ${isCatalogOpen 
                    ? "bg-white text-black border-white" 
                    : "bg-[#252525] hover:bg-[#333] text-white border-white/10"
                  }`}
              >
                {isCatalogOpen ? <X size={18} /> : <LayoutGrid size={18} />} 
                Каталог
              </button>
            </div>

            {/* ПОШУК */}
            <div className="flex-1 max-w-2xl relative hidden md:block">
              <input 
                type="text" 
                placeholder="Я шукаю..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-black rounded-l-lg py-2.5 pl-4 pr-12 focus:outline-none placeholder-gray-500 font-medium"
              />
              <button className="absolute right-0 top-0 bottom-0 bg-[#252525] hover:bg-[#333] px-4 rounded-r-lg border-l border-gray-300 flex items-center justify-center transition">
                <Search size={20} className="text-white" />
              </button>
            </div>

            {/* ІКОНКИ */}
            <div className="flex items-center gap-5 flex-shrink-0">
              <button className="md:hidden text-white"><Search size={24} /></button>
              <Link href="/profile" className="hidden lg:flex flex-col items-center gap-1 text-gray-400 hover:text-white transition group">
                <User size={22} className="group-hover:scale-110 transition"/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Кабінет</span>
              </Link>
              <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition group relative">
                <div className="relative">
                  <ShoppingBag size={22} className="group-hover:scale-110 transition" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-[#111]">
                      {cart.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:block">Кошик</span>
              </button>
              <button onClick={handleLogout} className="hidden lg:flex flex-col items-center gap-1 text-gray-400 hover:text-red-500 transition group">
                <LogOut size={22} className="group-hover:scale-110 transition"/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Вихід</span>
              </button>
              <button className="lg:hidden text-white" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={28} />
              </button>
            </div>
          </div>
        </div>

        {/* === MEGA MENU DROPDOWN (Випадаюче меню) === */}
        <AnimatePresence>
          {isCatalogOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 w-full bg-[#151515] border-t border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-40 overflow-hidden"
            >
              <div className="max-w-[1400px] mx-auto flex min-h-[400px]">
                
                {/* ЛІВА КОЛОНКА (Спецпропозиції) */}
                <div className="w-64 bg-[#1a1a1a] p-6 border-r border-white/5 flex flex-col gap-4">
                   <div className="flex items-center gap-3 text-green-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition">
                      <Sparkles size={20}/> Новинки
                   </div>
                   <div className="flex items-center gap-3 text-red-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition">
                      <Flame size={20}/> Акційні пропозиції
                   </div>
                   <div className="flex items-center gap-3 text-blue-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition">
                      <Percent size={20}/> Уцінка
                   </div>
                   
                   <div className="mt-auto p-4 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl border border-white/10">
                      <p className="text-xs text-blue-200 font-bold uppercase mb-2">B2B Партнерство</p>
                      <p className="text-sm text-gray-300 mb-3">Отримайте індивідуальні умови для великих замовлень.</p>
                      <button className="text-xs bg-white text-black px-3 py-1.5 rounded font-bold hover:bg-gray-200 transition">Детальніше</button>
                   </div>
                </div>

                {/* ПРАВА КОЛОНКА (Категорії) */}
                <div className="flex-1 p-8">
                   <div className="grid grid-cols-4 gap-x-8 gap-y-10">
                      {CATALOG_MENU.map((section, idx) => (
                        <div key={idx}>
                           <h3 className="font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center justify-between group cursor-pointer hover:text-blue-400 transition">
                             {section.category} <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition"/>
                           </h3>
                           <ul className="space-y-2.5">
                             {section.items.map((item, i) => (
                               <li key={i}>
                                 <a href="#catalog" onClick={() => { setIsCatalogOpen(false); setSearchQuery(item); }} className="text-sm text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block">
                                   {item}
                                 </a>
                               </li>
                             ))}
                           </ul>
                        </div>
                      ))}
                   </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Затемнення фону, коли меню відкрите */}
        {isCatalogOpen && (
          <div className="fixed inset-0 top-[80px] bg-black/70 backdrop-blur-sm z-30" onClick={() => setIsCatalogOpen(false)}></div>
        )}
      </header>

      {/* === ГОЛОВНИЙ КОНТЕНТ === */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 lg:px-8 py-8 space-y-12">
        
        {/* === ГЕРОЙ-СЛАЙДЕР === */}
        <div className="relative w-full h-[350px] md:h-[450px] bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl border border-white/5 group">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 w-full h-full"
            >
              <div className="absolute inset-0">
                 {currentBanner.image_url ? (
                    <img src={currentBanner.image_url} alt="Banner" className="w-full h-full object-cover opacity-60" />
                 ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">NO IMAGE</div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#111]/70 to-transparent"></div>
              </div>

              <div className="absolute inset-0 flex items-center">
                <div className="px-8 md:px-16 w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                   <div>
                      <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="inline-block border border-white/20 text-gray-300 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider bg-black/30 backdrop-blur-md">REBRAND Exclusive</motion.div>
                      <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-4xl md:text-6xl font-black leading-none mb-2 text-white uppercase">{currentBanner.title}</motion.h2>
                      <motion.h3 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-3xl md:text-5xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase">{currentBanner.subtitle}</motion.h3>
                      <p className="text-gray-300 text-lg mb-8 max-w-md line-clamp-2">{currentBanner.description}</p>
                      <button onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })} className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition">Детальніше</button>
                   </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="absolute bottom-8 right-8 flex items-center gap-4 z-20">
             <span className="text-2xl font-mono font-bold text-white">{currentSlide + 1}<span className="text-gray-500 text-lg">/{activeBanners.length}</span></span>
             <div className="flex gap-2">
                <button onClick={prevSlide} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition"><ArrowLeft size={18}/></button>
                <button onClick={nextSlide} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition shadow-lg"><ArrowRight size={18}/></button>
             </div>
          </div>
        </div>

        {/* === КАТАЛОГ === */}
        <section id="catalog">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-3xl font-bold">Найкращі пропозиції</h2>
             <div className="h-[1px] bg-white/10 flex-1 mx-6 hidden md:block"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-[#1a1a1a] rounded-2xl p-4 hover:shadow-2xl hover:-translate-y-1 transition duration-300 group border border-white/5 flex flex-col relative overflow-hidden">
                <div className="absolute top-4 left-4 z-10 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-1 rounded-md uppercase">Хіт</div>
                <div className="aspect-[4/5] bg-black rounded-xl overflow-hidden mb-4 relative">
                  {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700"><Package size={32}/></div>}
                  <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition bg-black/50 p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100"><Heart size={18} /></button>
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 text-gray-100">{product.title}</h3>
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                    <div><span className="text-2xl font-bold text-white">{product.price} <span className="text-sm font-normal text-gray-500">грн</span></span></div>
                    <button onClick={() => addToCart(product)} className="bg-white text-black w-10 h-10 flex items-center justify-center rounded-xl hover:bg-blue-500 hover:text-white transition shadow-lg"><ShoppingBag size={20} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#0a0a0a] border-t border-white/10 py-12 mt-12"><div className="max-w-[1400px] mx-auto px-8 text-center text-gray-500 text-sm"><p>&copy; 2024 REBRAND STUDIO. Усі права захищено.</p></div></footer>

      {isCartOpen && <div className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>}
      <div className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#1a1a1a] border-l border-white/10 z-[70] transform transition-transform duration-300 shadow-2xl flex flex-col ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#151515]"><h2 className="text-xl font-bold">Кошик</h2><button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.map((item, idx) => (
               <div key={idx} className="flex gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
                  <div className="w-20 h-20 bg-black rounded-lg overflow-hidden flex-shrink-0">{item.image_url && <img src={item.image_url} className="w-full h-full object-cover"/>}</div>
                  <div className="flex-1 flex flex-col justify-between">
                     <div className="flex justify-between"><h4 className="font-bold text-sm line-clamp-2">{item.title}</h4><button onClick={() => removeFromCart(idx)} className="text-gray-500 hover:text-red-500"><X size={18}/></button></div>
                     <div className="font-bold text-lg">{item.price} ₴</div>
                  </div>
               </div>
            ))}
          </div>
          {cart.length > 0 && <div className="p-6 bg-[#151515] border-t border-white/10"><div className="flex justify-between items-center mb-6"><span className="text-gray-400">Всього</span><span className="text-2xl font-bold">{totalPrice} ₴</span></div><button onClick={placeOrder} disabled={isOrdering} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition disabled:opacity-50">Оформити</button></div>}
      </div>
    </div>
  );
}