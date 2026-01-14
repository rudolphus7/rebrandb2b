'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Heart, User, LogOut, Search, Menu, X, LayoutGrid, ChevronRight, Sparkles, Flame, Percent, Sun, Moon, Loader2 } from 'lucide-react';
import { useCart } from '@/components/CartContext';
import { useWishlist } from '@/components/WishlistContext';
import { useTheme } from '@/components/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import MobileSearchOverlay from '@/components/MobileSearchOverlay';

interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  sub: { name: string; slug: string }[]; // Змінили: тепер sub це об'єкт, а не просто рядок
}

export default function Header() {
  // Helper function to extract image URL from various formats
  const getImageUrl = (images: any): string => {
    // Debug logging to see exact format
    console.log('🖼️ RAW:', images);
    console.log('🖼️ Type:', typeof images, '| IsArray:', Array.isArray(images));
    if (images && typeof images === 'object') {
      console.log('🖼️ Keys:', Object.keys(images), '| Values:', Object.values(images));
    }

    if (images === null || images === undefined) {
      console.log('❌ Null or undefined');
      return '/placeholder.png';
    }

    // Case 1: Real Array
    if (Array.isArray(images)) {
      return images.length > 0 ? images[0] : '/placeholder.png';
    }

    // Case 2: String processing
    if (typeof images === 'string') {
      let cleanImage = images.trim();

      // Handle Postgres array format: {"url1","url2"} or {url1,url2}
      if (cleanImage.startsWith('{') && cleanImage.endsWith('}')) {
        // Remove outer curly braces
        cleanImage = cleanImage.slice(1, -1).trim();

        // Split by comma and take first element
        const firstItem = cleanImage.split(',')[0].trim();

        // Remove all quotes (both single and double)
        cleanImage = firstItem.replace(/["']/g, '').trim();

        // Return if it's a valid URL or path
        if (cleanImage && (cleanImage.startsWith('http') || cleanImage.startsWith('/'))) {
          return cleanImage;
        }
      }
      // Handle JSON format: ["url"]
      else if (cleanImage.startsWith('[') && cleanImage.endsWith(']')) {
        try {
          const parsed = JSON.parse(cleanImage);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '/placeholder.png';
        } catch {
          // If parse fails, continue to next check
        }
      }
      // Direct URL or path (also remove any quotes)
      else {
        cleanImage = cleanImage.replace(/["']/g, '').trim();
        if (cleanImage && (cleanImage.startsWith('http') || cleanImage.startsWith('/'))) {
          return cleanImage;
        }
      }
    }

    return '/placeholder.png';
  };

  const router = useRouter();
  const searchParams = useSearchParams(); // New hook
  const { toggleCart, items } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false); // New state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Instant Search Logic for Desktop
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const trimmedQuery = searchQuery.trim();
      const safeQuery = trimmedQuery.replace(/[,%()]/g, ' ').trim();

      if (trimmedQuery.length > 1) {
        setIsSearching(true);
        setShowResults(true);
        try {
          // Construct the OR filter string carefully
          const { data, error } = await supabase
            .rpc('search_products', { keyword: safeQuery })
            .limit(5);

          if (data) {
            console.log('Search results:', data); // Debug log
            setSearchResults(data as any);
          }
          if (error) {
            console.error('Search RPC error:', error);
          }
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const [dynamicCategories, setDynamicCategories] = useState<MenuCategory[]>([]);
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    // Синхронізація пошукового запиту
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);

    // Авторизація...
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    // --- ЗАВАНТАЖЕННЯ КАТЕГОРІЙ ---
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug, parent_id')
        .order('name');

      if (data) {
        const categoryMap = new Map();
        const roots: any[] = [];

        // Батьки
        data.forEach(cat => {
          if (!cat.parent_id) {
            categoryMap.set(cat.id, {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              sub: []
            });
            roots.push(cat.id);
          }
        });

        // Діти (Тепер зберігаємо і SLUG!)
        data.forEach(cat => {
          if (cat.parent_id && categoryMap.has(cat.parent_id)) {
            const parent = categoryMap.get(cat.parent_id);
            if (parent) {
              // ВАЖЛИВО: Зберігаємо об'єкт {name, slug}
              parent.sub.push({ name: cat.name, slug: cat.slug });
            }
          }
        });

        const menuStructure = roots.map(id => categoryMap.get(id));
        menuStructure.sort((a, b) => a.name.localeCompare(b.name));
        setDynamicCategories(menuStructure);
      }
    }
    fetchCategories();

    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(searchQuery)}`);
      setIsMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (!user) return null;

  return (
    <>
      <header className="bg-background text-foreground sticky top-0 z-40 border-b border-gray-200 dark:border-white/10 h-20 flex items-center transition-colors duration-300">
        <div className="container mx-auto px-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-black italic tracking-tighter shrink-0 hover:text-gray-200 transition">
              REBRAND
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`hidden md:flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all duration-200 ${isMenuOpen ? 'bg-white text-black' : 'bg-[#222] hover:bg-[#333] text-white'}`}
            >
              {isMenuOpen ? <X size={20} /> : <LayoutGrid size={20} />}
              <span>Каталог</span>
            </button>
          </div>

          <div className="flex-1 max-w-xl relative hidden md:block">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Я шукаю..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                onBlur={() => setTimeout(() => setShowResults(false), 200)} // Delay to allow clock on link
                className="w-full bg-gray-100 dark:bg-[#333] text-black dark:text-white h-11 pl-4 pr-12 rounded-sm outline-none focus:ring-0 placeholder:text-gray-500 font-medium border border-transparent focus:border-blue-500 transition-colors"
                autoComplete="off"
              />
              <button type="submit" className="absolute right-0 top-0 h-11 w-11 bg-gray-200 dark:bg-[#333] flex items-center justify-center text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-black transition-colors">
                {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
              </button>
            </form>

            {/* Desktop Search Results Dropdown */}
            {showResults && searchQuery.length > 1 && (
              <div className="absolute top-full left-0 w-[800px] mt-2 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-[60]">
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-[2fr_1fr]">
                    {/* Left Column: Products */}
                    <div className="border-r border-gray-100 dark:border-white/5">
                      <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-xs font-bold uppercase text-gray-500 tracking-wider">
                        Товари
                      </div>
                      <div>
                        {searchResults.map((product) => (
                          <Link
                            key={product.id}
                            href={`/product/${product.slug}`}
                            onClick={() => {
                              setShowResults(false);
                              setSearchQuery('');
                            }}
                            className="flex items-start gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group border-b border-gray-100 dark:border-white/5 last:border-0"
                          >
                            <div className="w-12 h-16 bg-gray-100 dark:bg-white/5 rounded-md overflow-hidden shrink-0 border border-gray-200 dark:border-white/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getImageUrl(product.images)}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center h-16">
                              <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors mb-0.5">{product.title}</div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">Арт: {product.vendor_article}</span>
                                <span className="text-sm font-bold text-black dark:text-white">{product.price} грн</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Suggestions */}
                    <div className="bg-gray-50/50 dark:bg-white/[0.02]">
                      <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 text-xs font-bold uppercase text-gray-500 tracking-wider">
                        Швидкий пошук
                      </div>
                      <div className="py-2">
                        {searchResults.map((product) => (
                          <Link
                            key={`s-${product.id}`}
                            href={`/product/${product.slug}`}
                            onClick={() => {
                              setShowResults(false);
                              setSearchQuery('');
                            }}
                            className="block px-5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors truncate"
                          >
                            {product.title}
                          </Link>
                        ))}
                        <Link
                          href={`/catalog?q=${encodeURIComponent(searchQuery)}`}
                          onClick={() => setShowResults(false)}
                          className="block px-5 py-2 text-sm font-bold text-blue-600 hover:text-blue-700 mt-2"
                        >
                          Всі результати ({searchResults.length}+)
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                    <Search className="mx-auto mb-3 opacity-20" size={48} />
                    <p className="font-medium">Товарів не знайдено</p>
                    <p className="text-xs mt-1 text-gray-400">Спробуйте змінити запит</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={() => setIsSearchOpen(true)} className="md:hidden hover:text-blue-400 transition-colors text-gray-700 dark:text-gray-300">
            <Search size={24} />
          </button>
          <Link href="/wishlist" className="relative hover:text-blue-400 transition-colors text-gray-700 dark:text-gray-300">
            <Heart size={24} />
            {wishlistItems.length > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">{wishlistItems.length}</span>}
          </Link>
          <Link href={user ? "/profile" : "/login"} className="hidden md:block hover:text-blue-400 transition-colors text-gray-700 dark:text-gray-300"><User size={24} /></Link>
          <Link href={user ? "/profile" : "/login"} className="md:hidden hover:text-blue-400 transition-colors text-gray-700 dark:text-gray-300"><User size={24} /></Link>
          <button onClick={toggleTheme} className="hidden md:block hover:text-yellow-400 transition-colors text-gray-700 dark:text-gray-300">
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button onClick={toggleCart} className="relative hover:text-blue-400 transition-colors text-gray-700 dark:text-gray-300">
            <ShoppingBag size={24} />
            {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">{cartCount}</span>}
          </button>
          {user && <button onClick={handleLogout} className="hidden md:block hover:text-red-500 transition-colors text-gray-700 dark:text-gray-300"><LogOut size={24} /></button>}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-gray-700 dark:text-white transition-colors">{isMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
        </div>
      </header>

      <MobileSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {
        isMenuOpen && (
          <div className="fixed inset-0 z-30 top-20 bg-background text-foreground animate-in slide-in-from-top-5 duration-300 overflow-y-auto">
            <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row h-full gap-10">

              <div className="w-full md:w-64 flex-shrink-0 space-y-8 md:border-r border-gray-200 dark:border-white/10 pr-6">
                {/* Мобільний пошук ... */}

                <div className="space-y-6">
                  {/* Mobile Controls Row */}
                  <div className="flex items-center gap-6 md:hidden border-b border-gray-100 dark:border-white/10 pb-6">
                    <button onClick={toggleTheme} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold">
                      {theme === 'dark' ? <><Sun size={20} /> Світла</> : <><Moon size={20} /> Темна</>}
                    </button>
                    <Link href="/wishlist" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold">
                      <Heart size={20} /> Обране {wishlistItems.length > 0 && `(${wishlistItems.length})`}
                    </Link>
                  </div>
                  <div className="md:hidden border-b border-gray-100 dark:border-white/10 pb-6">
                    <Link href={user ? "/profile" : "/login"} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold">
                      <User size={20} /> {user ? "Мій кабінет" : "Увійти"}
                    </Link>
                  </div>

                  <Link href="/catalog?sort=new" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 font-bold text-lg group"><Sparkles size={24} /> Новинки</Link>
                  <Link href="/catalog?sort=promo" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 font-bold text-lg group"><Flame size={24} /> Акційна пропозиція</Link>
                  <Link href="/catalog?sort=sale" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-bold text-lg group"><Percent size={24} /> Уцінка</Link>
                </div>
                <div className="bg-gray-100 dark:bg-[#1a1a1a] rounded-xl p-6 border border-gray-200 dark:border-white/10 mt-auto hidden md:block">
                  <h4 className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-2">B2B Партнерство</h4>
                  <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="block w-full bg-black dark:bg-white text-white dark:text-black text-center font-bold text-sm py-2.5 rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition">ДЕТАЛЬНІШЕ</Link>
                </div>
              </div>

              <div className="flex-1 pb-20 md:pb-0">
                {dynamicCategories.length === 0 ? <div className="text-gray-500 py-10">Завантаження категорій...</div> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
                    {dynamicCategories.map((cat) => (
                      <div key={cat.slug} className="group">
                        <Link
                          href={`/catalog?category=${cat.slug}`}
                          className="text-gray-900 dark:text-white font-bold uppercase tracking-wider mb-4 block hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between border-b border-transparent group-hover:border-blue-500 pb-1 w-fit transition-all"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {cat.name}
                        </Link>
                        <ul className="space-y-2.5">
                          {cat.sub.map((subItem) => (
                            <li key={subItem.slug}>
                              <Link
                                // ВАЖЛИВО: ТЕПЕР МИ ПОСИЛАЄМОСЬ НА КАТЕГОРІЮ, А НЕ НА ПОШУК
                                href={`/catalog?category=${subItem.slug}`}
                                className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors block"
                                onClick={() => setIsMenuOpen(false)}
                              >
                                {subItem.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}