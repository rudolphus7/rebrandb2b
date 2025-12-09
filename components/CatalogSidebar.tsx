'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
// Тут ми імпортуємо іконку Menu і перейменовуємо її в MenuIcon для зручності
import { Search, X, ChevronDown, ChevronUp, Menu as MenuIcon } from 'lucide-react';
import Link from 'next/link';

// Інтерфейс для вхідних даних з бази (плоский список)
interface Category {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
}

// Інтерфейс для дерева категорій (для рендеру)
interface CategoryTreeNode extends Category {
    sub: CategoryTreeNode[];
}

interface SidebarProps {
  categories: Category[]; 
  availableColors: string[];
  maxPrice: number;
}

// ІМЕНОВАНИЙ ЕКСПОРТ
export function CatalogSidebar({ categories, availableColors, maxPrice }: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- ТРАНСФОРМАЦІЯ ДАНИХ ---
  const categoriesTree = useMemo(() => {
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    categories.forEach(cat => {
        categoryMap.set(cat.id, { ...cat, sub: [] });
    });

    categories.forEach(cat => {
        if (cat.parent_id && categoryMap.has(cat.parent_id)) {
            const parent = categoryMap.get(cat.parent_id);
            parent?.sub.push(categoryMap.get(cat.id)!);
        } else {
            if (!cat.parent_id) {
                roots.push(categoryMap.get(cat.id)!);
            }
        }
    });

    return roots.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // --- СТАН ФІЛЬТРІВ ---
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get('minPrice') || '0',
    max: searchParams.get('maxPrice') || String(maxPrice)
  });
  const [selectedColors, setSelectedColors] = useState<string[]>(
    searchParams.get('color')?.split(',').filter(Boolean) || []
  );

  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  // --- ЛОГІКА ---
  const applyFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    });
    params.delete('page');
    router.push(`/catalog?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (searchParams.get('q') || '')) {
        applyFilters({ q: search || null });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleCategory = (slug: string) => {
    if (expandedCats.includes(slug)) {
      setExpandedCats(prev => prev.filter(c => c !== slug));
    } else {
      setExpandedCats(prev => [...prev, slug]);
    }
  };

  const selectSubCategorySlug = (slug: string) => {
      applyFilters({ category: slug }); 
  };

  const toggleColor = (color: string) => {
    const newColors = selectedColors.includes(color)
      ? selectedColors.filter(c => c !== color)
      : [...selectedColors, color];
    setSelectedColors(newColors);
    applyFilters({ color: newColors.length > 0 ? newColors.join(',') : null });
  };

  const handleReset = () => {
      setSearch('');
      setPriceRange({ min: '0', max: String(maxPrice) });
      setSelectedColors([]);
      router.push('/catalog');
  };

  // --- РЕНДЕРИНГ ---
  return (
    <aside className="w-full md:w-[280px] flex-shrink-0 space-y-6 text-white">
      
      {/* Кнопка скидання */}
      {(searchParams.toString().length > 0) && (
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase hover:text-red-300 transition-colors mb-2"
          >
            <X size={14} /> Скинути всі фільтри
          </button>
      )}

      {/* 1. КАТЕГОРІЇ */}
      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <MenuIcon />
            <h3 className="font-bold text-lg">Категорії</h3>
        </div>
        
        <ul className="text-sm">
           {categoriesTree.length === 0 ? (
               <li className="p-4 text-gray-500 text-center">Категорії відсутні</li>
           ) : (
               categoriesTree.map(cat => {
                 const isOpen = expandedCats.includes(cat.slug);
                 const isActive = searchParams.get('category') === cat.slug;
                 const hasSub = cat.sub.length > 0;

                 return (
                   <li key={cat.id} className="border-b border-white/5 last:border-0">
                     <div className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${isActive ? 'text-blue-400 font-bold' : 'text-gray-300'}`}
                          onClick={() => toggleCategory(cat.slug)}>
                        <span onClick={(e) => {
                            e.stopPropagation();
                            applyFilters({ category: cat.slug });
                        }} className="flex-1 hover:text-white transition-colors">
                            {cat.name}
                        </span>
                        {hasSub && (
                            isOpen ? <ChevronUp size={16} className="text-gray-500"/> : <ChevronDown size={16} className="text-gray-500"/>
                        )}
                     </div>

                     {/* Підкатегорії */}
                     {isOpen && hasSub && (
                        <ul className="bg-[#111] py-2 px-6 space-y-1 border-t border-white/5">
                            {cat.sub.map(sub => (
                                <li key={sub.id} 
                                    onClick={() => selectSubCategorySlug(sub.slug)}
                                    className={`py-1 cursor-pointer transition-colors flex items-center gap-2 ${searchParams.get('category') === sub.slug ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <div className={`w-1 h-1 rounded-full ${searchParams.get('category') === sub.slug ? 'bg-blue-500' : 'bg-gray-600'}`}></div> 
                                    {sub.name}
                                </li>
                            ))}
                        </ul>
                     )}
                   </li>
                 );
               })
           )}
        </ul>
      </div>

      {/* 2. ПОШУК */}
      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 p-5">
        <h3 className="font-bold mb-4 flex justify-between">Пошук</h3>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Я шукаю..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-white/20 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          <Search size={16} className="absolute right-3 top-3 text-gray-500" />
        </div>
      </div>

      {/* 3. ЦІНА */}
      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 p-5">
         <h3 className="font-bold mb-4">Ціна (грн)</h3>
         <div className="flex items-center gap-2 mb-4">
            <input 
              type="number" 
              value={priceRange.min}
              onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              className="bg-[#111] border border-white/20 rounded-lg px-2 py-2 text-sm w-full text-center text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            <span className="text-gray-500">-</span>
            <input 
              type="number" 
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              className="bg-[#111] border border-white/20 rounded-lg px-2 py-2 text-sm w-full text-center text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
         </div>
         <button 
            onClick={() => applyFilters({ minPrice: priceRange.min, maxPrice: priceRange.max })}
            className="w-full py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
         >
           Застосувати
         </button>
      </div>

      {/* 4. КОЛІР */}
      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 p-5">
         <h3 className="font-bold mb-4">Колір</h3>
         <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {availableColors.map(color => (
              <label key={color} className="flex items-center gap-3 text-sm text-gray-400 cursor-pointer hover:text-white p-1 rounded transition-colors group">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={selectedColors.includes(color)}
                    onChange={() => toggleColor(color)}
                    className="peer w-4 h-4 rounded border border-gray-600 bg-transparent checked:bg-blue-500 checked:border-blue-500 appearance-none transition-colors cursor-pointer"
                  />
                  <svg className="absolute w-3 h-3 text-white hidden peer-checked:block pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                {color}
              </label>
            ))}
         </div>
      </div>
    </aside>
  );
}