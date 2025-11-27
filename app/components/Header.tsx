"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, ShoppingBag, LogOut, User, Menu, LayoutGrid, X, 
  Sparkles, Flame, Percent, ChevronRight, Phone, Send, MessageCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CATALOG_MENU = [
  { category: "Одяг & Текстиль", items: ["Футболки", "Худі & Світшоти", "Поло", "Кепки & Шапки", "Жилетки", "Фліс"] },
  { category: "Офіс & Канцелярія", items: ["Блокноти", "Ручки", "Щоденники", "Папки", "Ланьярди"] },
  { category: "Посуд & Напої", items: ["Термочашки", "Пляшки", "Чашки", "Термоси", "Бокали"] },
  { category: "Сумки & Рюкзаки", items: ["Шопери", "Рюкзаки", "Сумки", "Бананки", "Косметички"] },
  { category: "Гаджети", items: ["Powerbanks", "Флешки", "Колонки", "Зарядки", "Навушники"] },
  { category: "Дім & Відпочинок", items: ["Пледи", "Парасолі", "Інструменти", "Ланчбокси", "Ігри"] }
];

export default function Header({ 
  onCartClick, 
  cartCount, 
  onLogout, 
  onMobileMenuClick 
}: { 
  onCartClick: () => void, 
  cartCount: number, 
  onLogout: () => void,
  onMobileMenuClick: () => void
}) {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#111111] border-b border-white/10 shadow-xl">
        <div className="relative z-50 bg-[#111111] py-4">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center justify-between gap-6">
            
            <div className="flex items-center gap-6 flex-shrink-0">
              <Link href="/" className="text-2xl font-black italic tracking-tighter cursor-pointer select-none text-white">
                REBRAND
              </Link>
              
              <button 
                onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                className={`hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition duration-200 border
                  ${isCatalogOpen ? "bg-white text-black border-white" : "bg-[#252525] hover:bg-[#333] text-white border-white/10"}`}
              >
                {isCatalogOpen ? <X size={18} /> : <LayoutGrid size={18} />} 
                Каталог
              </button>
            </div>

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

            <div className="flex items-center gap-5 flex-shrink-0">
              <button className="md:hidden text-white"><Search size={24} /></button>
              
              <Link href="/profile" className="hidden lg:flex flex-col items-center gap-1 text-gray-400 hover:text-white transition group">
                <User size={22} className="group-hover:scale-110 transition"/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Кабінет</span>
              </Link>

              <button onClick={onCartClick} className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition group relative">
                <div className="relative">
                  <ShoppingBag size={22} className="group-hover:scale-110 transition" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-[#111]">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:block">Кошик</span>
              </button>

              <button onClick={onLogout} className="hidden lg:flex flex-col items-center gap-1 text-gray-400 hover:text-red-500 transition group">
                <LogOut size={22} className="group-hover:scale-110 transition"/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Вихід</span>
              </button>

              <button className="lg:hidden text-white" onClick={onMobileMenuClick}>
                <Menu size={28} />
              </button>
            </div>
          </div>
        </div>

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
                <div className="w-64 bg-[#1a1a1a] p-6 border-r border-white/5 flex flex-col gap-4">
                   <div className="flex items-center gap-3 text-green-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition"><Sparkles size={20}/> Новинки</div>
                   <div className="flex items-center gap-3 text-red-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition"><Flame size={20}/> Акційні пропозиції</div>
                   <div className="flex items-center gap-3 text-blue-400 font-bold p-2 hover:bg-white/5 rounded-lg cursor-pointer transition"><Percent size={20}/> Уцінка</div>
                   <div className="mt-auto p-4 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl border border-white/10">
                      <p className="text-xs text-blue-200 font-bold uppercase mb-2">B2B Партнерство</p>
                      <button className="text-xs bg-white text-black px-3 py-1.5 rounded font-bold hover:bg-gray-200 transition">Детальніше</button>
                   </div>
                </div>
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
                                 <Link href={`/catalog?q=${item}`} onClick={() => setIsCatalogOpen(false)} className="text-sm text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block">
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
        
        {isCatalogOpen && (
          <div className="fixed inset-0 top-[80px] bg-black/70 backdrop-blur-sm z-30" onClick={() => setIsCatalogOpen(false)}></div>
        )}
      </header>
    </>
  );
}