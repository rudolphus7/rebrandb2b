"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, ShoppingBag, LogOut, User, X,
  Menu, LayoutGrid, Sparkles, Flame, Percent, ChevronRight,
  Home
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";

interface HeaderProps {
  onCartClick: () => void;
  cartCount: number;
  onLogout: () => void;
  onMobileMenuClick?: () => void; 
}

export default function Header({ onCartClick, cartCount, onLogout }: HeaderProps) {
  // --- STATE ---
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  // Categories from DB
  const [categories, setCategories] = useState<any[]>([]);

  const router = useRouter();
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // --- FETCH CATEGORIES ---
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });
      
      if (data) {
        setCategories(data);
      }
    }
    fetchCategories();
  }, []);

  // Filter categories for menu tree
  const rootCategories = categories.filter(c => !c.parent_id && !['270', '213', 'discount'].includes(c.id));
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  // --- HANDLERS ---
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

  // Focus mobile search input when opened
  useEffect(() => {
    if (isMobileSearchOpen && mobileInputRef.current) {
        mobileInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  // Lock body scroll when mobile menu is open
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
              
              {/* --- LEFT: BURGER (Mobile) + LOGO + CATALOG (Desktop) --- */}
              <div className="flex items-center gap-3 lg:gap-6 flex-shrink-0">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition"
                  aria-label="Menu"
                >
                  <Menu size={24} />
                </button>

                <div 
                  className="text-xl lg:text-2xl font-black italic tracking-tighter cursor-pointer select-none text-white" 
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

              {/* --- CENTER: SEARCH (Desktop) --- */}
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

              {/* --- RIGHT: ICONS --- */}
              <div className="flex items-center gap-1 sm:gap-3">
                {/* Search Toggle (Mobile) */}
                <button 
                  className={`lg:hidden p-2 rounded-full transition ${isMobileSearchOpen ? "bg-white text-black" : "text-white hover:bg-white/10"}`}
                  onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                >
                  <Search size={22} />
                </button>

                <Link href="/wishlist" className="p-2 text-white hover:bg-white/10 rounded-full transition relative">
  <Heart size={22} />
  {/* Можна додати лічильник, якщо підключите useWishlist() в Header */}
</Link>



                <Link href="/profile" className="p-2 text-white hover:bg-white/10 rounded-full transition">
                  <User size={22} />
                </Link>

                <button onClick={onCartClick} className="p-2 text-white hover:bg-white/10 rounded-full transition relative">
                  <ShoppingBag size={22} />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-[#111]">
                      {cartCount}
                    </span>
                  )}
                </button>
                
                <button onClick={onLogout} className="hidden lg:flex items-center gap-1 p-2 text-gray-400 hover:text-red-500 transition">
                  <LogOut size={22} />
                </button>
              </div>
            </div>

            {/* --- MOBILE SEARCH BAR --- */}
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
                    
                    {/* Left Column (Specials) */}
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
                      <div className="mt-auto p-4 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl border border-white/10">
                          <p className="text-[10px] text-blue-200 font-bold uppercase mb-1">B2B Партнерство</p>
                          <button className="text-[10px] bg-white text-black px-3 py-1.5 rounded font-bold hover:bg-gray-200 transition uppercase">Детальніше</button>
                      </div>
                    </div>

                    {/* Right Column (Categories from DB) */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar overscroll-contain">
                      <div className="grid grid-cols-5 gap-x-6 gap-y-8">
                          {rootCategories.map((root) => (
                            <div key={root.id} className="break-inside-avoid">
                              <h3 className="font-bold text-white uppercase tracking-wider mb-3 border-b border-white/10 pb-1 flex items-center justify-between group cursor-pointer hover:text-blue-400 transition text-xs">
                                <Link href={`/catalog?category=${root.name}`} onClick={() => setIsCatalogOpen(false)}>{root.name}</Link> 
                                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition"/>
                              </h3>
                              <ul className="space-y-1">
                                {getChildren(root.id).map((child) => (
                                  <li key={child.id}>
                                    <Link href={`/catalog?category=${child.name}`} onClick={() => setIsCatalogOpen(false)} className="text-xs text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block py-0.5">{child.name}</Link>
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

      {/* --- MOBILE MENU DRAWER (SLIDE-OUT) --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden font-sans">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ x: "-100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "-100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute top-0 left-0 h-full w-[85%] max-w-[320px] bg-white text-black shadow-2xl overflow-y-auto flex flex-col"
            >
                {/* Drawer Header */}
                <div className="p-4 flex items-center justify-between border-b border-gray-200 sticky top-0 bg-white z-10">
                  <span className="text-lg font-bold">Каталог</span>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="p-2 -mr-2 rounded-full hover:bg-gray-100"
                  >
                    <X size={24}/>
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 py-2">
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

                  <div className="px-4">
                      {rootCategories.map((root) => {
                          const isExpanded = expandedCategory === root.name;
                          return (
                              <div key={root.id} className="border-b border-gray-100 last:border-0">
                                  <button 
                                    onClick={() => toggleCategory(root.name)}
                                    className="w-full flex items-center justify-between py-3 text-left font-medium text-lg"
                                  >
                                      {root.name}
                                      <ChevronRight size={20} className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                                  </button>
                                  
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
                                                    onClick={() => handleLinkClick(`/catalog?category=${root.name}`)} 
                                                    className="block text-blue-600 font-bold text-sm cursor-pointer"
                                                  >
                                                      Всі товари категорії
                                                  </div>
                                                  {getChildren(root.id).map((child) => (
                                                      <div 
                                                        key={child.id} 
                                                        onClick={() => handleLinkClick(`/catalog?category=${child.name}`)} 
                                                        className="block text-gray-600 text-sm cursor-pointer hover:text-black"
                                                      >
                                                          {child.name}
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