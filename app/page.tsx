"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link"; 
import LoginPage from "./components/LoginPage"; 
import { 
  Search, ShoppingBag, LogOut, User, X, ArrowRight, Package, 
  Phone, Send, MessageCircle, ChevronDown, ArrowDown, Star, Zap, Plus // <--- ОСЬ ЦЬОГО НЕ ВИСТАЧАЛО
} from "lucide-react";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [cart, setCart] = useState<any[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProducts();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProducts();
    });

    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase.from("products").select("*").order('id', { ascending: false });
    if (!error) setProducts(data || []);
  }

  function addToCart(product: any) {
    setCart([...cart, product]);
    setIsCartOpen(true);
  }

  function removeFromCart(indexToRemove: number) {
    setCart(cart.filter((_, index) => index !== indexToRemove));
  }

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function placeOrder() {
    if (cart.length === 0) return alert("Кошик порожній!");
    setIsOrdering(true);

    const { error } = await supabase.from('orders').insert([{
        user_email: session.user.email,
        total_price: totalPrice,
        items: cart 
    }]);

    if (!error) {
      // Telegram notification (optional block)
      try {
        await fetch('/api/telegram', {
          method: 'POST',
          body: JSON.stringify({ email: session.user.email, total: totalPrice, items: cart })
        });
      } catch (e) {}

      alert("Замовлення успішно створено!");
      setCart([]); 
      setIsOrdering(false);
      setIsCartOpen(false);
    } else {
      alert("Помилка: " + error.message);
      setIsOrdering(false);
    }
  }

  async function handleLogin(emailInput: string, passwordInput: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) alert("Access Denied: " + error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProducts([]); setCart([]);
  }

  // Функція для плавного скролу до секцій
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!session) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-600/30 flex flex-col scroll-smooth">
      
      {/* === HEADER (ШАПКА) === */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
          isScrolled ? "bg-black/80 backdrop-blur-xl py-3 border-white/10" : "bg-transparent py-6 border-transparent"
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-6 flex items-center justify-between">
          
          {/* Логотип */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-2xl font-black tracking-tighter italic cursor-pointer flex items-center gap-2"
          >
            <span className="bg-white text-black px-2 py-1 rounded-sm not-italic">R</span> REBRAND
          </div>

          {/* Меню (Працює!) */}
          <nav className="hidden xl:flex items-center gap-8 text-xs font-bold tracking-[0.15em] uppercase text-zinc-400">
            <button onClick={() => scrollToSection('about')} className="hover:text-white transition duration-300 relative group">
              Про нас
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button onClick={() => scrollToSection('catalog')} className="text-white relative group">
              Каталог
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-500"></span>
            </button>
            <button onClick={() => window.location.href = '#'} className="hover:text-white transition duration-300">Контакти</button>
          </nav>

          {/* Іконки */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-4 border-r border-white/10 pr-6">
               {[MessageCircle, Send, Phone].map((Icon, i) => (
                 <button key={i} className="w-9 h-9 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition duration-300">
                   <Icon size={14} />
                 </button>
               ))}
            </div>

            <Link href="/profile" className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white transition bg-zinc-900/50 rounded-full hover:bg-zinc-800">
              <User size={18} />
            </Link>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-white relative transition hover:scale-110 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"
            >
              <ShoppingBag size={18} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold border border-black">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* === HERO SECTION (ПЕРШИЙ ЕКРАН) === */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Фонові ефекти */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000000_100%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 animate-fade-in-up">
            <Zap size={12} fill="currentColor" /> B2B Partner Portal v2.0
          </div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-600">
            REBRAND<br/>STUDIO
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            Єдина екосистема для замовлення мерчу, брендування та корпоративних подарунків. 
            Швидко. Якісно. Гуртом.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => scrollToSection('catalog')}
              className="px-8 py-4 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-blue-500 hover:text-white transition duration-300 rounded-full"
            >
              Перейти до каталогу
            </button>
            <button onClick={() => scrollToSection('about')} className="px-8 py-4 border border-white/20 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition duration-300 rounded-full">
              Дізнатись більше
            </button>
          </div>
        </div>

        {/* Скрол індикатор */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-500 animate-bounce">
          <ArrowDown size={24} />
        </div>
      </section>

      {/* === БЛОК "ПРО НАС" (Щоб працювало меню) === */}
      <section id="about" className="py-24 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
           <div>
              <h3 className="text-blue-500 font-bold mb-2 uppercase tracking-widest text-xs">Чому ми</h3>
              <h2 className="text-3xl font-bold mb-4">Якість понад усе</h2>
              <p className="text-zinc-500">Використовуємо тільки перевірені матеріали та сучасні методи нанесення.</p>
           </div>
           <div>
              <h3 className="text-purple-500 font-bold mb-2 uppercase tracking-widest text-xs">Швидкість</h3>
              <h2 className="text-3xl font-bold mb-4">Від 3 днів</h2>
              <p className="text-zinc-500">Власне виробництво дозволяє нам віддавати замовлення в рекордні терміни.</p>
           </div>
           <div>
              <h3 className="text-green-500 font-bold mb-2 uppercase tracking-widest text-xs">Сервіс</h3>
              <h2 className="text-3xl font-bold mb-4">B2B Підхід</h2>
              <p className="text-zinc-500">Персональний менеджер, документообіг та зручний кабінет для замовлень.</p>
           </div>
        </div>
      </section>

      {/* === КАТАЛОГ === */}
      <section id="catalog" className="py-20 bg-black min-h-screen relative">
        <div className="max-w-[1800px] mx-auto px-6">
           
          {/* Фільтр і Заголовок каталогу */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6 sticky top-24 z-30 py-4 bg-black/95 backdrop-blur">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">КАТАЛОГ</h2>
              <p className="text-zinc-500">Оберіть категорію або знайдіть товар</p>
            </div>
            
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition" size={18} />
              <input 
                type="text" 
                placeholder="Пошук (наприклад: Худі)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-4 pl-12 pr-6 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-white placeholder-zinc-600 shadow-lg"
              />
            </div>
          </div>

          {/* СІТКА ТОВАРІВ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group flex flex-col gap-4">
                {/* Картка Фото */}
                <div className="aspect-[4/5] bg-zinc-900 rounded-2xl relative overflow-hidden">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      className="w-full h-full object-cover transition duration-700 ease-in-out group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                      <Package size={32} />
                      <span className="text-xs font-bold tracking-widest">NO IMAGE</span>
                    </div>
                  )}
                  
                  {/* Бейдж "NEW" (фейковий для краси) */}
                  <div className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    New Drop
                  </div>

                  {/* Кнопка на фото (тільки десктоп) */}
                  <button 
                    onClick={() => addToCart(product)}
                    className="absolute bottom-4 right-4 bg-white text-black p-3 rounded-full opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition duration-300 shadow-xl hover:bg-blue-500 hover:text-white"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                {/* Інфо під фото */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">{product.title}</h3>
                    <span className="font-mono text-lg font-bold">{product.price} ₴</span>
                  </div>
                  
                  <button 
                    onClick={() => addToCart(product)}
                    className="w-full py-3 border border-white/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition duration-300 flex items-center justify-center gap-2 group/btn"
                  >
                    <span>Купити</span>
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="py-12 border-t border-white/10 bg-zinc-950 text-center text-zinc-600 text-sm">
        <div className="mb-4 text-2xl font-black italic text-zinc-800">REBRAND</div>
        <p>&copy; 2024 REBRAND STUDIO. All rights reserved.</p>
      </footer>

      {/* === КОШИК (DRAWER) === */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity" onClick={() => setIsCartOpen(false)}></div>
      )}

      <div className={`fixed top-0 right-0 h-full w-full md:w-[480px] bg-zinc-950 border-l border-white/10 z-[70] transform transition-transform duration-500 shadow-2xl ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
            <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={18} className="text-blue-500"/> Кошик ({cart.length})
            </h2>
            <button onClick={() => setIsCartOpen(false)} className="text-zinc-500 hover:text-white transition p-2 bg-white/5 rounded-full"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-2">
                   <ShoppingBag size={32} strokeWidth={1} />
                </div>
                <p className="uppercase tracking-widest text-xs">Ваш кошик порожній</p>
                <button onClick={() => setIsCartOpen(false)} className="text-blue-500 hover:text-white transition text-sm font-bold">Повернутись до каталогу</button>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/30 transition group">
                  <div className="w-20 h-24 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image_url && <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                         <h4 className="font-bold text-sm text-white line-clamp-2">{item.title}</h4>
                         <button onClick={() => removeFromCart(idx)} className="text-zinc-600 hover:text-red-500 transition"><X size={16}/></button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Артикул: {item.id}</p>
                    </div>
                    <p className="font-mono text-blue-400 font-bold">{item.price} ₴</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-6 border-t border-white/10 bg-zinc-900">
              <div className="flex justify-between mb-2">
                <span className="text-zinc-400 text-sm">Сума товарів</span>
                <span className="font-mono text-white">{totalPrice} ₴</span>
              </div>
              <div className="flex justify-between mb-6 pt-2 border-t border-white/5">
                <span className="text-white font-bold uppercase tracking-widest text-sm">Всього до сплати</span>
                <span className="text-2xl font-mono font-bold text-blue-400">{totalPrice} ₴</span>
              </div>
              <button 
                onClick={placeOrder}
                disabled={isOrdering}
                className="w-full bg-white text-black hover:bg-blue-600 hover:text-white font-bold py-4 text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition duration-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOrdering ? "Обробка..." : "Оформити замовлення"}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}