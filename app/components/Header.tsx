"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, ShoppingBag, LogOut, User, X,
  Menu, LayoutGrid, Sparkles, Flame, Percent, ChevronRight,
  ChevronDown, Home
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- ДАНІ МЕНЮ ---
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
  onMobileMenuClick?: () => void; 
}

export default function Header({ onCartClick, cartCount, onLogout }: HeaderProps) {
  // Стани
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Стан для акордеонів мобільного меню (яка категорія відкрита)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const router = useRouter();
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Навігація
  const handleLinkClick = (path: string) => {
    setIsMobileMenuOpen(false);
    setIsCatalogOpen(false);
    router.push(path);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
        router.push(`/catalog?q=${searchQuery}`);
        setIsCatalogOpen(false);
        setIsMobileSearchOpen(false);
        setIsMobileMenuOpen(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
  };

  // Автофокус для мобільного пошуку
  useEffect(() => {
    if (isMobileSearchOpen && mobileInputRef.current) {
        mobileInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  // Блокування скролу сторінки при відкритому мобільному меню
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#111111] border-b border-white/10 shadow-xl w-full">
          <div className="max-w-[1600px] mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              
              {/* --- ЛІВА ЧАСТИНА: БУРГЕР + ЛОГО --- */}
              <div className="flex items-center gap-3 lg:gap-6 flex-shrink-0">
                {/* Бургер (Тільки моб) */}
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition"
                  aria-label="Menu"
                >
                  <Menu size={24} />
                </button>

                {/* Логотип */}
                <div 
                  className="text-xl lg:text-2xl font-black italic tracking-tighter cursor-pointer select-none text-white" 
                  onClick={() => router.push('/')}
                >
                  REBRAND
                </div>

                {/* Кнопка Каталог (Тільки десктоп) */}
                <button 
                  onClick={() => setIsCatalogOpen(!isCatalogOpen)} 
                  className={`hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition duration-200 border ${isCatalogOpen ? "bg-white text-black border-white" : "bg-[#252525] hover:bg-[#333] text-white border-white/10"}`}
                >
                  {isCatalogOpen ? <X size={18} /> : <LayoutGrid size={18} />} Каталог
                </button>
              </div>

              {/* --- ЦЕНТР: ПОШУК (Тільки десктоп) --- */}
              <div className="hidden lg:block flex-1 max-w-xl mx-auto px-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Я шукаю..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full bg-white text-black rounded-lg py-2.5 pl-4 pr-12 focus:outline-none placeholder-gray-500 font-medium" 
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} 
                  />
                  <button 
                    onClick={handleSearch} 
                    className="absolute right-0 top-0 bottom-0 bg-[#252525] hover:bg-[#333] px-4 rounded-r-lg border-l border-gray-300 flex items-center justify-center transition"
                  >
                    <Search size={20} className="text-white" />
                  </button>
                </div>
              </div>

              {/* --- ПРАВА ЧАСТИНА: ІКОНКИ --- */}
              <div className="flex items-center gap-1 sm:gap-3">
                
                {/* 1. Пошук (Тільки моб) */}
                <button 
                  className={`lg:hidden p-2 rounded-full transition ${isMobileSearchOpen ? "bg-white text-black" : "text-white hover:bg-white/10"}`}
                  onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                >
                  <Search size={22} />
                </button>

                {/* 2. Профіль */}
                <Link href="/profile" className="p-2 text-white hover:bg-white/10 rounded-full transition">
                  <User size={22} />
                </Link>

                {/* 3. Кошик */}
                <button onClick={onCartClick} className="p-2 text-white hover:bg-white/10 rounded-full transition relative">
                  <ShoppingBag size={22} />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-[#111]">
                      {cartCount}
                    </span>
                  )}
                </button>
                
                {/* 4. Вихід (Тільки десктоп) */}
                <button onClick={onLogout} className="hidden lg:flex items-center gap-1 p-2 text-gray-400 hover:text-red-500 transition">
                  <LogOut size={22} />
                </button>
              </div>
            </div>

            {/* --- МОБІЛЬНИЙ РЯДОК ПОШУКУ --- */}
            <AnimatePresence>
              {isMobileSearchOpen && (
                  <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="lg:hidden overflow-hidden mt-2"
                  >
                      <div className="relative py-2">
                          <input 
                              ref={mobileInputRef}
                              type="text" 
                              placeholder="Що шукаємо?" 
                              value={searchQuery} 
                              onChange={(e) => setSearchQuery(e.target.value)} 
                              className="w-full bg-white text-black rounded-lg py-3 pl-4 pr-12 focus:outline-none font-bold shadow-lg"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} 
                          />
                          <button 
                              onClick={handleSearch}
                              className="absolute right-1 top-3 p-2 bg-[#252525] rounded-md text-white"
                          >
                              <Search size={18}/>
                          </button>
                      </div>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* --- DESKTOP MEGA MENU --- */}
          <AnimatePresence>
            {isCatalogOpen && (
              <>
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }} 
                    transition={{ duration: 0.2 }} 
                    className="hidden lg:block absolute top-full left-0 w-full bg-[#151515] border-t border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-40 overflow-hidden"
                >
                  <div className="max-w-[1600px] mx-auto flex max-h-[80vh]">
                    {/* ЛІВА КОЛОНКА */}
                    <div className="w-64 bg-[#1a1a1a] p-6 border-r border-white/5 flex flex-col gap-6 sticky top-0 overflow-y-auto custom-scrollbar">
                      <div className="flex items-center gap-3 text-green-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition text-xs" onClick={() => handleLinkClick('/catalog?category=Новинки')}>
                          <Sparkles size={18}/> Новинки
                      </div>
                      <div className="flex items-center gap-3 text-red-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition text-xs" onClick={() => handleLinkClick('/catalog?category=Акційна пропозиція')}>
                          <Flame size={18}/> Акційна пропозиція
                      </div>
                      <div className="flex items-center gap-3 text-blue-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition text-xs" onClick={() => handleLinkClick('/catalog?category=Уцінка')}>
                          <Percent size={18}/> Уцінка
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
                                    <Link href={`/catalog?category=${item}`} onClick={() => setIsCatalogOpen(false)} className="text-xs text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block py-0.5">{item}</Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
                <div className="fixed inset-0 top-[80px] bg-black/70 backdrop-blur-sm z-30 hidden lg:block" onClick={() => setIsCatalogOpen(false)}></div>
              </>
            )}
          </AnimatePresence>
      </header>

      {/* --- MOBILE MENU DRAWER (ОНОВЛЕНИЙ) --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden font-sans">
            {/* Затемнення */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            {/* Меню */}
            <motion.div 
              initial={{ x: "-100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "-100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute top-0 left-0 h-full w-[85%] max-w-[320px] bg-white text-black shadow-2xl overflow-y-auto flex flex-col"
            >
                {/* Шапка меню */}
                <div className="p-4 flex items-center justify-between border-b border-gray-200 sticky top-0 bg-white z-10">
                  <span className="text-lg font-bold">Каталог</span>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="p-2 -mr-2 rounded-full hover:bg-gray-100"
                  >
                    <X size={24}/>
                  </button>
                </div>

                <div className="flex-1 py-2">
                  
                  {/* Спец пропозиції */}
                  <div className="px-4 py-2 space-y-1">
                      <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4" onClick={() => handleLinkClick('/catalog?category=Новинки')}>
                          <span>Новинки</span>
                      </div>
                      <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4" onClick={() => handleLinkClick('/catalog?category=Акційна пропозиція')}>
                          <span>Акційна пропозиція</span>
                      </div>
                      <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4" onClick={() => handleLinkClick('/catalog?category=Уцінка')}>
                          <span>Уцінка</span>
                      </div>
                  </div>

                  <div className="h-[1px] bg-gray-200 mx-4 my-2"></div>

                  {/* Список категорій (Акордеон) */}
                  <div className="px-4">
                      {CATALOG_MENU.map((section, idx) => {
                          const isExpanded = expandedCategory === section.category;
                          return (
                              <div key={idx} className="border-b border-gray-100 last:border-0">
                                  <button 
                                    onClick={() => toggleCategory(section.category)}
                                    className="w-full flex items-center justify-between py-3 text-left font-medium text-lg"
                                  >
                                      {section.category}
                                      <ChevronRight size={20} className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                                  </button>
                                  
                                  {/* Підкатегорії */}
                                  <AnimatePresence>
                                      {isExpanded && (
                                          <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                          >
                                              <div className="pl-4 pb-4 space-y-3">
                                                  <div 
                                                    onClick={() => handleLinkClick(`/catalog?category=${section.category}`)} 
                                                    className="block text-blue-600 font-bold text-sm cursor-pointer"
                                                  >
                                                      Всі товари категорії
                                                  </div>
                                                  {section.items.map((item, i) => (
                                                      <div 
                                                        key={i} 
                                                        onClick={() => handleLinkClick(`/catalog?category=${item}`)} 
                                                        className="block text-gray-600 text-sm cursor-pointer hover:text-black"
                                                      >
                                                          {item}
                                                      </div>
                                                  ))}
                                              </div>
                                          </motion.div>
                                      )}
                                  </AnimatePresence>
                              </div>
                          );
                      })}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-10">
                  <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-500 font-bold text-sm p-3 rounded-xl hover:bg-red-50 transition border border-red-200">
                    <LogOut size={18}/> Вийти з акаунту
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}