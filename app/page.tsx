'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ArrowRight, LayoutGrid, Shirt, Briefcase, 
  Coffee, Monitor, Heart, ShoppingBag, ShieldAlert, LogOut 
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/CartContext";

import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import ProductImage from "@/components/ProductImage";
import LoginPage from "@/components/LoginPage";

const VISUAL_CATEGORIES = [
  { id: "clothing", title: "Одяг", slug: "clothing", image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1000&auto=format&fit=crop", icon: Shirt },
  { id: "office", title: "Офіс", slug: "office", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1000&auto-format&fit=crop", icon: Briefcase },
  { id: "dishes", title: "Посуд", slug: "home", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=1000&auto-format&fit=crop", icon: Coffee },
  { id: "gadgets", title: "Електроніка", slug: "electronics", image: "https://images.unsplash.com/photo-1550009158-9ebf69056955?q=80&w=1000&auto-format&fit=crop", icon: Monitor },
];

const DEFAULT_SLIDES = [
  {
    id: 1,
    title: "НОВА КОЛЕКЦІЯ",
    subtitle: "WINTER 2025",
    description: "Оверсайз худі з преміум бавовни. Ідеально під нанесення.",
    image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "КОРПОРАТИВНИЙ",
    subtitle: "МЕРЧ",
    description: "Одягніть команду в якість. Знижки для B2B до -30%.",
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2000&auto-format&fit=crop",
  }
];

export default function Home() {
  const router = useRouter();
  
  // ВИПРАВЛЕНО: беремо addItem замість addToCart
  const { addItem } = useCart();
  
  const [session, setSession] = useState<any>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>(DEFAULT_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- ЛОГІКА АВТОРИЗАЦІЇ ---
  useEffect(() => {
    const checkUserStatus = async (currentSession: any) => {
        if (!currentSession) return;
        const { data: profile } = await supabase.from('profiles').select('is_verified').eq('id', currentSession.user.id).single();
        setIsVerified(profile ? profile.is_verified : false);
    };

    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
            checkUserStatus(session);
            fetchContent();
        }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) {
            checkUserStatus(session);
            fetchContent();
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- АВТОМАТИЧНИЙ СЛАЙДЕР ---
  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // --- ЗАВАНТАЖЕННЯ КОНТЕНТУ ---
  async function fetchContent() {
    const { data: prodData } = await supabase
        .from("products")
        .select("id, title, base_price, image_url, description, vendor_article, slug")
        .order('created_at', { ascending: false }) 
        .limit(8);

    if (prodData) setProducts(prodData);

    const { data: bannerData } = await supabase.from("banners").select("*").order('id', { ascending: false });
    if (bannerData && bannerData.length > 0) setBanners(bannerData);
  }

  // --- ОБРОБНИКИ ПОДІЙ ---
  const handleAddToCart = (product: any) => {
    // ВИПРАВЛЕНО: addItem приймає об'єкт CartItem
    addItem({
        id: product.vendor_article, // Тимчасовий ID для швидкого додавання
        productId: product.id,
        title: product.title || product.description,
        price: product.base_price,
        image: product.image_url,
        quantity: 1,
        color: 'Standard', // Дефолтне значення, бо з головної ми не вибираємо колір
        size: 'One Size',  // Дефолтне значення
        vendorArticle: product.vendor_article
    });
  };

  const handleLogin = async (e: string, p: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) alert(error.message);
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setIsVerified(null);
  };

  // --- РЕНДЕРИНГ ЕКРАНІВ ---

  if (!session) return <LoginPage onLogin={handleLogin} />;

  if (isVerified === null) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Завантаження...</div>;

  if (isVerified === false) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
                  <div className="w-20 h-20 bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-500/30">
                      <ShieldAlert size={40} className="text-yellow-500"/>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-3">Акаунт на перевірці</h1>
                  <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
                      Ваша заявка обробляється. Ми перевіримо дані компанії та відкриємо доступ до B2B цін.
                  </p>
                  <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-white bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl transition">
                      <LogOut size={18}/> Вийти
                  </button>
              </div>
          </div>
      );
  }

  const currentBanner = banners[currentSlide];

  return (
    <div className="min-h-screen bg-[#111111] text-white font-sans flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-12">
        
        {/* === СЛАЙДЕР === */}
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
                    <div className="w-full h-full bg-zinc-800"></div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#111]/70 to-transparent"></div>
              </div>
              
              <div className="absolute inset-0 flex items-center">
                <div className="px-8 md:px-16 w-full max-w-3xl">
                   <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="inline-block border border-white/20 text-gray-300 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider bg-black/30 backdrop-blur-md">REBRAND Exclusive</motion.div>
                   <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-4xl md:text-6xl font-black leading-none mb-2 text-white uppercase">{currentBanner.title}</motion.h2>
                   <motion.h3 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-3xl md:text-5xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase">{currentBanner.subtitle}</motion.h3>
                   <p className="text-gray-300 text-lg mb-8 max-w-lg line-clamp-2">{currentBanner.description}</p>
                   <Link href="/catalog" className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition inline-block">Детальніше</Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="absolute bottom-8 right-8 flex items-center gap-4 z-20">
             <div className="flex gap-2">
                <button onClick={() => setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1))} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition"><ArrowLeft size={18}/></button>
                <button onClick={() => setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1))} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition shadow-lg"><ArrowRight size={18}/></button>
             </div>
          </div>
        </div>

        {/* === КАТЕГОРІЇ === */}
        <section>
           <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><LayoutGrid size={24} className="text-blue-500"/> Популярні категорії</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {VISUAL_CATEGORIES.map((cat) => (
                <div key={cat.id} className="relative h-48 rounded-2xl overflow-hidden cursor-pointer group border border-white/5" onClick={() => router.push(`/catalog?category=${cat.slug}`)}> 
                   <img src={cat.image} alt={cat.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-110 transition duration-500" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                   <div className="absolute bottom-0 left-0 p-4 w-full">
                      <cat.icon className="text-white mb-2 opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition duration-300" size={24}/>
                      <h3 className="text-lg font-bold text-white leading-tight">{cat.title}</h3>
                   </div>
                </div>
              ))}
           </div>
        </section>

        {/* === ХІТИ ПРОДАЖУ (ТОВАРИ) === */}
        <section id="catalog">
          <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Новинки</h2>
              <Link href="/catalog" className="text-sm text-gray-400 hover:text-white flex items-center gap-1">Дивитись всі <ArrowRight size={14}/></Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-[#1a1a1a] rounded-2xl p-4 hover:shadow-2xl hover:-translate-y-1 transition duration-300 group border border-white/5 flex flex-col relative overflow-hidden">
                
                <div className="absolute top-4 left-4 z-10 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-1 rounded-md uppercase">New</div>
                
                <div className="aspect-[4/5] bg-black rounded-xl overflow-hidden mb-4 relative">
                  <Link href={`/product/${product.slug || product.id}`} className="block w-full h-full">
                    <ProductImage 
                        src={product.image_url} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500 cursor-pointer" 
                    />
                  </Link>
                  <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition bg-black/50 p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100"><Heart size={18} /></button>
                </div>

                <div className="flex-1 flex flex-col">
                  <Link href={`/product/${product.slug || product.id}`}>
                    <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 text-gray-100 hover:text-blue-400 transition cursor-pointer h-[50px]">{product.title}</h3>
                  </Link>
                  
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                    <div>
                        <span className="text-2xl font-bold text-white">{new Intl.NumberFormat('uk-UA').format(product.base_price)} <span className="text-xs font-normal text-gray-500">грн</span></span>
                    </div>
                    <button onClick={() => handleAddToCart(product)} className="bg-white text-black w-10 h-10 flex items-center justify-center rounded-xl hover:bg-blue-500 hover:text-white transition shadow-lg active:scale-95">
                        <ShoppingBag size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#0a0a0a] border-t border-white/10 py-12 mt-12">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
              <p>&copy; 2025 REBRAND STUDIO. Всі права захищено.</p>
          </div>
      </footer>

      <CartDrawer />
    </div>
  );
}