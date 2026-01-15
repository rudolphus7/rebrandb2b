'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronUp, Menu as MenuIcon, Filter } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface CategoryTreeNode extends Category {
  sub: CategoryTreeNode[];
}

interface SidebarProps {
  categories: Category[];
  availableColors: string[];
  maxPrice: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export function CatalogSidebar({ categories, availableColors, maxPrice, isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Close mobile menu on route change
  useEffect(() => {
    if (isOpen && onClose) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Disable body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  // ... (rest of logic same) ...

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
  const [onlyInStock, setOnlyInStock] = useState(searchParams.get('inStock') === 'true');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(searchParams.get('label')); // New State

  const toggleInStock = () => {
    const newVal = !onlyInStock;
    setOnlyInStock(newVal);
    applyFilters({ inStock: newVal ? 'true' : null });
  };

  const toggleLabel = (value: string) => {
    const newVal = selectedLabel === value ? null : value;
    setSelectedLabel(newVal);
    applyFilters({ label: newVal });
  };

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

  // ... (useEffect for search sync) ...

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
    setOnlyInStock(false);
    setSelectedLabel(null);
    router.push('/catalog');
  };

  // --- REUSABLE CONTENT ---
  const SidebarContent = () => (
    <div className="space-y-6 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Кнопка скидання */}
      {(searchParams.toString().length > 0) && (
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase hover:text-red-400 transition-colors mb-2"
        >
          <X size={14} /> Скинути всі фільтри
        </button>
      )}

      {/* 1. КАТЕГОРІЇ */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-2 bg-gray-50 dark:bg-transparent">
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
                      onClose?.();
                    }} className="flex-1 hover:text-white transition-colors">
                      {cat.name}
                    </span>
                    {hasSub && (
                      isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </div>

                  {/* Підкатегорії */}
                  {isOpen && hasSub && (
                    <ul className="bg-[#111] py-2 px-6 space-y-1 border-t border-white/5">
                      {cat.sub.map(sub => (
                        <li key={sub.id}
                          onClick={() => {
                            selectSubCategorySlug(sub.slug);
                            onClose?.();
                          }}
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
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 p-5 transition-colors">
        <h3 className="font-bold mb-4 flex justify-between text-gray-900 dark:text-white">Пошук</h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Я шукаю..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/20 rounded-lg pl-3 pr-10 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-500"
          />
          <Search size={16} className="absolute right-3 top-3 text-gray-500" />
        </div>
      </div>

      {/* 2.5a. МАРКЕТИНГ (NEW) */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 p-5 transition-colors">
        <h3 className="font-bold mb-4 text-gray-900 dark:text-white">Маркетинг</h3>
        <div className="space-y-2">
          {[
            { value: 'new', name: 'Новинка', color: 'text-green-500' },
            { value: 'sale', name: 'Розпродаж (Sale)', color: 'text-blue-500' },
            { value: 'promo', name: 'Акція (Hot)', color: 'text-red-500' },
            { value: 'hit', name: 'Хіт продажу', color: 'text-yellow-500' },
          ].map(l => (
            <label key={l.value} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedLabel === l.value}
                  onChange={() => toggleLabel(l.value)}
                  className={`peer w-5 h-5 rounded-full border border-gray-600 bg-transparent checked:border-current ${l.color} appearance-none transition-colors cursor-pointer`}
                />
                <div className={`absolute w-3 h-3 rounded-full bg-current ${l.color} hidden peer-checked:block pointer-events-none`} />
              </div>
              <span className={selectedLabel === l.value ? `font-bold ${l.color}` : ''}>{l.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 2.5b. НАЯВНІСТЬ (In Stock) */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 p-5 transition-colors">
        <h3 className="font-bold mb-4 text-gray-900 dark:text-white">Наявність</h3>
        <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors group">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={toggleInStock}
              className="peer w-5 h-5 rounded border border-gray-600 bg-transparent checked:bg-green-500 checked:border-green-500 appearance-none transition-colors cursor-pointer"
            />
            <svg className="absolute w-3.5 h-3.5 text-white hidden peer-checked:block pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          Тільки в наявності
        </label>
      </div>

      {/* 3. ЦІНА */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 p-5 transition-colors">
        <h3 className="font-bold mb-4 text-gray-900 dark:text-white">Ціна (грн)</h3>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            value={priceRange.min}
            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
            className="bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/20 rounded-lg px-2 py-2 text-sm w-full text-center text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          <span className="text-gray-500">-</span>
          <input
            type="number"
            value={priceRange.max}
            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
            className="bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/20 rounded-lg px-2 py-2 text-sm w-full text-center text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button
          onClick={() => {
            applyFilters({ minPrice: priceRange.min, maxPrice: priceRange.max });
            onClose?.();
          }}
          className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Застосувати
        </button>
      </div>

      {/* 4. КОЛІР */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 p-5 transition-colors">
        <h3 className="font-bold mb-4 text-gray-900 dark:text-white">Колір</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          {availableColors.map(color => (
            <label key={color} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-400 cursor-pointer hover:text-black dark:hover:text-white p-1 rounded transition-colors group">
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
    </div>
  );

  // --- РЕНДЕРИНГ (Desktop Sidebar + Mobile Drawer) ---
  return (
    <>
      {/* 1. DESKTOP SIDEBAR (Static, hidden on mobile) */}
      <aside className="hidden md:block w-[280px] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* 2. MOBILE DRAWER (Fixed, hidden on desktop) */}
      <div className={`md:hidden fixed inset-0 z-[100] transition-visibility duration-300 ${isOpen ? 'visible' : 'invisible'}`}>

        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />

        {/* Drawer Panel */}
        <aside className={`
            fixed top-0 left-0 bottom-0 w-[300px] bg-white dark:bg-[#111] z-[101] p-6 overflow-y-auto shadow-2xl transition-transform duration-300
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Фільтри</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
              <X size={24} />
            </button>
          </div>

          <SidebarContent />
        </aside>
      </div>
    </>
  );
}