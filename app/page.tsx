"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link"; 
import LoginPage from "./components/LoginPage"; 
import { 
  Search, ShoppingBag, LogOut, User, Plus, X, ArrowRight, Package, 
  Phone, Send, MessageCircle, ChevronDown 
} from "lucide-react";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Кошик (тепер контролюємо видимість)
  const [cart, setCart] = useState<any[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false); // Стан: відкрито чи ні
  
  // Скрол
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

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
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

  // --- ЛОГІКА ---
  function addToCart(product: any) {
    setCart([...cart, product]);
    setIsCartOpen(true); // Автоматично відкрити кошик при додаванні
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

    if (error) {
      alert("Error: " + error.message);
      setIsOrdering(false);
      return;
    }

    try {
      await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          total: totalPrice,
          items: cart
        })
      });
    } catch (e) { console.error(e); }

    alert("Замовлення прийнято!");
    setCart([]); 
    setIsOrdering(false);
    setIsCartOpen(false);
  }

  async function handleLogin(emailInput: string, passwordInput: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) alert("Access Denied: " + error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProducts([]);
    setCart([]);
  }

  if (!session) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 flex flex-col">
      
      {/* === HEADER === */}
      <header 
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b border-white/10 ${
          isScrolled ? "bg-black/90 backdrop-blur-md py-3" : "bg-black py-5"
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-6 flex items-center justify-between">
          
          {/* ЛОГОТИП */}
          <div className="flex items-center gap-4">
            <div className="text-2xl font-black tracking-tighter italic select-none cursor-pointer">
              REBRAND
            </div>
          </div>

          {/* НАВІГАЦІЯ (ЦЕНТР) */}
          <nav className="hidden xl:flex items-center gap-10 text-xs font-bold tracking-widest uppercase text-zinc-400">
            <a href="#" className="hover:text-white transition">Про нас</a>
            <a href="#" className="hover:text-white transition">Послуги</a>
            <a href="#" className="text-white">Каталог</a>
            <a href="#" className="hover:text-white transition">Контакти</a>
          </nav>

          {/* ПРАВА ПАНЕЛЬ ІКОНОК */}
          <div className="flex items-center gap-3">
            {/* Група контактів */}
            <div className="hidden md:flex items-center gap-2 mr-4 border-r border-white/10 pr-6">
               <button className="w-9 h-9 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition group">
                 <MessageCircle size={16} />
               </button>
               <button className="w-9 h-9 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition group">
                 <Send size={14} className="ml-0.5" /> 
               </button>
               <button className="w-9 h-9 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition group">
                 <Phone size={16} />
               </button>
            </div>

            {/* Група користувача (Профіль, Кошик, Вихід) */}
            
            {/* Пошук (маленька іконка) */}
            <button className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white transition">
              <Search size={20} />
            </button>

            {/* Профіль */}
            <Link href="/profile" className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white transition" title="Мій кабінет">
              <User size={20} />
            </Link>

            {/* Кошик */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-white relative transition hover:scale-110"
            >
              <ShoppingBag size={20} />
              {cart.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full text-[10px] flex items-center justify-center font-bold">
                  {cart.length}
                </span>
              )}
            </button>

             {/* Вихід */}
            <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-red-500 transition ml-2">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>


      {/* === ОСНОВНИЙ КОНТЕНТ (FULL WIDTH) === */}
      <div className="pt-24 min-h-screen">
        <main className="px-6 lg:px-10 pb-20 max-w-[1800px] mx-auto w-full">
           
          {/* Заголовок */}
          <div className="flex flex-col items-center justify-center text-center mb-16 mt-10">
             <span className="text-blue-500 text-xs font-bold tracking-[0.2em] uppercase mb-4">Official Store</span>
             <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">MERCH DROPS</h1>
             <p className="text-zinc-500 max-w-xl mx-auto">
               Ексклюзивний мерч для партнерів REBRAND STUDIO. Замовляйте гуртом, слідкуйте за статусом, отримуйте якість.
             </p>
          </div>

          {/* Сітка товарів */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group relative">
                {/* Фото */}
                <div className="aspect-[3/4] bg-zinc-900 w-full relative overflow-hidden mb-6">
                  {product.image_url ? (
                    <img src={product.image_url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-700 ease-in-out" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-800 font-bold">NO IMAGE</div>
                  )}
                  
                  {/* Швидка дія */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none">
                     <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-full text-white font-bold tracking-widest text-xs border border-white/20">
                        QUICK VIEW
                     </div>
                  </div>
                </div>

                {/* Інфо */}
                <div className="flex justify-between items-start border-t border-white/10 pt-4 group-hover:border-white/30 transition">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-lg leading-none mb-2">{product.title}</h3>
                    <button 
                       onClick={() => addToCart(product)}
                       className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest text-left transition"
                    >
                      + Add to Cart
                    </button>
                  </div>
                  <span className="font-mono text-lg text-white">{product.price} ₴</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* === ВИЇЖДЖАЮЧИЙ КОШИК (DRAWER) === */}
      {/* Затемнення фону */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsCartOpen(false)}
        ></div>
      )}

      {/* Панель кошика */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-[450px] bg-zinc-950 border-l border-white/10 z-50 transform transition-transform duration-500 shadow-2xl ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}>
        
        <div className="h-full flex flex-col">
          {/* Шапка кошика */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase tracking-tight">Ваш кошик <span className="text-zinc-500 ml-2 text-sm normal-case">({cart.length} позицій)</span></h2>
            <button onClick={() => setIsCartOpen(false)} className="text-zinc-500 hover:text-white transition">
              <X size={24} />
            </button>
          </div>

          {/* Список */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                <ShoppingBag size={48} strokeWidth={1} />
                <p className="uppercase tracking-widest text-xs">Кошик порожній</p>
                <button onClick={() => setIsCartOpen(false)} className="text-white border-b border-white pb-0.5 hover:text-blue-400 hover:border-blue-400 transition">Повернутись до покупок</button>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-20 h-24 bg-zinc-900 flex-shrink-0 overflow-hidden">
                    {item.image_url && <img src={item.image_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                         <h4 className="font-bold text-sm uppercase">{item.title}</h4>
                         <button onClick={() => removeFromCart(idx)} className="text-zinc-600 hover:text-red-500 transition"><X size={16}/></button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Size: M / Black</p>
                    </div>
                    <p className="font-mono">{item.price} ₴</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Футер кошика */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-white/10 bg-zinc-900">
              <div className="flex justify-between mb-6 items-end">
                <span className="text-zinc-400 text-sm uppercase tracking-widest">Разом до сплати</span>
                <span className="text-3xl font-mono">{totalPrice} <span className="text-lg text-zinc-500">₴</span></span>
              </div>
              <button 
                onClick={placeOrder}
                disabled={isOrdering}
                className="w-full bg-white text-black hover:bg-blue-600 hover:text-white font-bold py-5 text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition duration-300 disabled:opacity-50"
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