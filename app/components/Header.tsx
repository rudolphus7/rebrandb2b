"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, ShoppingBag, LogOut, User, X,
  Menu, LayoutGrid, Sparkles, Flame, Percent, ChevronRight,
  Phone, Home
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Повний список категорій для меню
const CATALOG_MENU = [
  { 
    category: "Сумки", 
    items: ["Валізи", "Косметички", "Мішок спортивний", "Рюкзаки", "Сумки для ноутбуків", "Сумки для покупок", "Сумки дорожні та спортивні", "Сумки на пояс", "Термосумки"] 
  },
  { 
    category: "Ручки", 
    items: ["Еко ручки", "Металеві ручки", "Олівці", "Пластикові ручки"] 
  },
  { 
    category: "Подорож та відпочинок", 
    items: ["Все для пікніка", "Ліхтарики", "Ланч бокси", "Лопати", "Пледи", "Пляшки для пиття", "Подушки", "Термоси та термокружки", "Фляги", "Фрізбі", "Штопори"] 
  },
  { 
    category: "Парасолі", 
    items: ["Парасолі складні", "Парасолі-тростини"] 
  },
  { 
    category: "Одяг", 
    items: ["Вітровки", "Рукавички", "Спортивний одяг", "Футболки", "Поло", "Дитячий одяг", "Реглани, фліси", "Жилети", "Куртки та софтшели"] 
  },
  { 
    category: "Головні убори", 
    items: ["Дитяча кепка", "Панами", "Шапки", "Кепки"] 
  },
  { 
    category: "Інструменти", 
    items: ["Викрутки", "Мультитули", "Набір інструментів", "Ножі", "Рулетки"] 
  },
  { 
    category: "Офіс", 
    items: ["Записні книжки", "Календарі"] 
  },
  { 
    category: "Персональні аксессуари", 
    items: ["Брелки", "Візитниці", "Дзеркала"] 
  },
  { 
    category: "Для професіоналів", 
    items: ["Опадоміри"] 
  },
  { 
    category: "Електроніка", 
    items: ["Аксесуари", "Годинники", "Зарядні пристрої", "Зволожувачі повітря", "Лампи", "Портативна акустика"] 
  },
  { 
    category: "Дім", 
    items: ["Дошки кухонні", "Кухонне приладдя", "Млини для спецій", "Набори для сиру", "Рушники", "Свічки", "Сковорідки", "Стакани", "Чайники", "Годівнички"] 
  },
  { 
    category: "Посуд", 
    items: ["Горнятка"] 
  },
  { 
    category: "Упаковка", 
    items: ["Подарункова коробка", "Подарунковий пакет"] 
  }
];

interface HeaderProps {
  onCartClick: () => void;
  cartCount: number;
  onLogout: () => void;
  onMobileMenuClick?: () => void; // Зробили необов'язковим, бо логіка тепер всередині
}

export default function Header({ onCartClick, cartCount, onLogout }: HeaderProps) {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Внутрішній стан для мобілки
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleMobileLinkClick = (path: string) => {
    setIsMobileMenuOpen(false);
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#111111] border-b border-white/10 shadow-xl">
        <div className="relative z-50 bg-[#111111] py-4">
          <div className="max-w-[1600px] mx-auto px-4 lg:px-8 flex items-center justify-between gap-6">
            
            {/* Лого + Каталог (Десктоп) */}
            <div className="flex items-center gap-6 flex-shrink-0">
              <div 
                className="text-2xl font-black italic tracking-tighter cursor-pointer select-none" 
                onClick={() => router.push('/')}
              >
                REBRAND
              </div>
              <button 
                onClick={() => setIsCatalogOpen(!isCatalogOpen)} 
                className={`hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition duration-200 border ${isCatalogOpen ? "bg-white text-black border-white" : "bg-[#252525] hover:bg-[#333] text-white border-white/10"}`}
              >
                {isCatalogOpen ? <X size={18} /> : <LayoutGrid size={18} />} Каталог
              </button>
            </div>

            {/* Пошук */}
            <div className="flex-1 max-w-2xl relative hidden md:block">
              <input 
                type="text" 
                placeholder="Я шукаю..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full bg-white text-black rounded-l-lg py-2.5 pl-4 pr-12 focus:outline-none placeholder-gray-500 font-medium" 
                onKeyDown={(e) => { 
                    if (e.key === 'Enter' && searchQuery.trim()) {
                        router.push(`/catalog?q=${searchQuery}`);
                        setIsCatalogOpen(false);
                    }
                }} 
              />
              <button 
                onClick={() => { 
                    if (searchQuery.trim()) {
                        router.push(`/catalog?q=${searchQuery}`);
                        setIsCatalogOpen(false);
                    }
                }} 
                className="absolute right-0 top-0 bottom-0 bg-[#252525] hover:bg-[#333] px-4 rounded-r-lg border-l border-gray-300 flex items-center justify-center transition"
              >
                <Search size={20} className="text-white" />
              </button>
            </div>

            {/* Іконки */}
            <div className="flex items-center gap-5 flex-shrink-0">
              <button className="md:hidden text-white"><Search size={24} /></button>
              <Link href="/profile" className="hidden lg:flex flex-col items-center gap-1 text-gray-400 hover:text-white transition group">
                <User size={22} className="group-hover:scale-110 transition"/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Кабінет</span>
              </Link>
              <button onClick={onCartClick} className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition group relative">
                <div className="relative">
                  <ShoppingBag size={22} className="group-hover:scale-110 transition" />
                  {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-[#111]">{cartCount}</span>}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:block">Кошик</span>
              </button>
              
              {/* Бургер меню для мобілки */}
              <button className="lg:hidden text-white" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={28} />
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP MEGA MENU DROPDOWN */}
        <AnimatePresence>
          {isCatalogOpen && (
            <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }} 
                transition={{ duration: 0.2 }} 
                className="hidden lg:block absolute top-full left-0 w-full bg-[#151515] border-t border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-40 overflow-hidden"
            >
              <div className="max-w-[1600px] mx-auto flex max-h-[80vh]">
                
                {/* ЛІВА КОЛОНКА */}
                <div className="w-64 bg-[#1a1a1a] p-4 border-r border-white/5 flex flex-col gap-2 sticky top-0 overflow-y-auto custom-scrollbar">
                   <div className="flex items-center gap-3 text-green-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition text-sm" onClick={() => { router.push('/catalog?category=Новинки'); setIsCatalogOpen(false); }}>
                      <Sparkles size={18}/> Новинки
                   </div>
                   <div className="flex items-center gap-3 text-red-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition text-sm" onClick={() => { router.push('/catalog?category=Акційна пропозиція'); setIsCatalogOpen(false); }}>
                      <Flame size={18}/> Акційна пропозиція
                   </div>
                   <div className="flex items-center gap-3 text-blue-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition text-sm" onClick={() => { router.push('/catalog?category=Уцінка'); setIsCatalogOpen(false); }}>
                      <Percent size={18}/> Уцінка
                   </div>
                   
                   <div className="mt-auto p-4 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl border border-white/10">
                      <p className="text-[10px] text-blue-200 font-bold uppercase mb-1">B2B Партнерство</p>
                      <p className="text-xs text-gray-300 mb-2 leading-tight">Індивідуальні умови для великих замовлень.</p>
                      <button className="text-[10px] bg-white text-black px-3 py-1.5 rounded font-bold hover:bg-gray-200 transition uppercase">Детальніше</button>
                   </div>
                </div>

                {/* ПРАВА КОЛОНКА */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar overscroll-contain">
                   <div className="grid grid-cols-5 gap-x-6 gap-y-8">
                      {CATALOG_MENU.map((section, idx) => (
                        <div key={idx} className="break-inside-avoid">
                           <h3 className="font-bold text-white uppercase tracking-wider mb-3 border-b border-white/10 pb-1 flex items-center justify-between group cursor-pointer hover:text-blue-400 transition text-xs">
                             <Link href={`/catalog?category=${section.category}`} onClick={() => setIsCatalogOpen(false)}>{section.category}</Link> 
                             <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition"/>
                           </h3>
                           <ul className="space-y-1">
                             {section.items.map((item, i) => (
                               <li key={i}>
                                 <Link 
                                    href={`/catalog?category=${item}`} 
                                    onClick={() => setIsCatalogOpen(false)} 
                                    className="text-xs text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block py-0.5"
                                 >
                                   {item}
                                 </Link>
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

        {/* MOBILE MENU DRAWER (ОНОВЛЕНО) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Затемнення */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm lg:hidden"
              />
              
              {/* Сама шторка меню */}
              <motion.div 
                initial={{ x: "-100%" }} 
                animate={{ x: 0 }} 
                exit={{ x: "-100%" }} 
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 h-full w-[85%] max-w-[320px] bg-[#1a1a1a] z-[70] lg:hidden overflow-y-auto border-r border-white/10 flex flex-col"
              >
                 <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xl font-black italic">MENU</span>
                    <button onClick={() => setIsMobileMenuOpen(false)}><X size={24}/></button>
                 </div>

                 <div className="flex-1 py-4">
                    {/* Основні посилання */}
                    <nav className="space-y-1 px-4 mb-6">
                        <button onClick={() => handleMobileLinkClick('/')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left font-bold text-lg"><Home size={20}/> Головна</button>
                        <button onClick={() => handleMobileLinkClick('/catalog')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left font-bold text-lg"><LayoutGrid size={20}/> Каталог</button>
                        <button onClick={() => handleMobileLinkClick('/profile')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left font-bold text-lg"><User size={20}/> Кабінет</button>
                    </nav>

                    <div className="h-[1px] bg-white/10 mx-4 mb-6"></div>

                    {/* Спеціальні пропозиції */}
                    <div className="px-4 space-y-2 mb-6">
                        <div className="flex items-center gap-3 text-green-400 font-bold p-2 hover:bg-white/5 rounded-lg" onClick={() => handleMobileLinkClick('/catalog?category=Новинки')}>
                            <Sparkles size={18}/> Новинки
                        </div>
                        <div className="flex items-center gap-3 text-red-400 font-bold p-2 hover:bg-white/5 rounded-lg" onClick={() => handleMobileLinkClick('/catalog?category=Акційна пропозиція')}>
                            <Flame size={18}/> Акції
                        </div>
                    </div>

                    <div className="h-[1px] bg-white/10 mx-4 mb-6"></div>

                    {/* Категорії (спрощений список) */}
                    <div className="px-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Розділи</h4>
                        <div className="space-y-3">
                            {CATALOG_MENU.map((section, idx) => (
                                <div key={idx} onClick={() => handleMobileLinkClick(`/catalog?category=${section.category}`)} className="text-gray-300 hover:text-white py-1">
                                    {section.category}
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>

                 {/* Футер меню */}
                 <div className="p-5 border-t border-white/10 bg-[#151515]">
                    <button onClick={onLogout} className="flex items-center gap-2 text-red-400 font-bold text-sm"><LogOut size={18}/> Вийти з акаунту</button>
                 </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        {/* Затемнення фону для десктопу */}
        {isCatalogOpen && <div className="fixed inset-0 top-[80px] bg-black/70 backdrop-blur-sm z-30 hidden lg:block" onClick={() => setIsCatalogOpen(false)}></div>}
    </header>
  );
}