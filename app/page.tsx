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


import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import LoginPage from "@/components/LoginPage";

// VISUAL_CATEGORIES removed as we use a custom grid now

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
      setCurrentSlide((prev) => (prev >= banners.length - 1 ? 0 : prev + 1));
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
    addItem({
      id: product.vendor_article,
      productId: product.id,
      title: product.title || product.description,
      price: product.base_price,
      image: product.image_url,
      // quantity: 1,  <-- ВИДАЛЕНО, бо addItem додає це автоматично
      color: 'Standard',
      size: 'One Size',
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
            <ShieldAlert size={40} className="text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Акаунт на перевірці</h1>
          <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
            Ваша заявка обробляється. Ми перевіримо дані компанії та відкриємо доступ до B2B цін.
          </p>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-white bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl transition">
            <LogOut size={18} /> Вийти
          </button>
        </div>
      </div>
    );
  }

  const currentBanner = banners[currentSlide];

  if (!currentBanner) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-colors duration-300">


      <main className="flex-1 container mx-auto px-4 py-8 space-y-12">

        {/* === СЛАЙДЕР === */}
        <div className="relative w-full h-[350px] md:h-[450px] bg-gray-100 dark:bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/5 group">
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
              <button onClick={() => setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1))} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition"><ArrowLeft size={18} /></button>
              <button onClick={() => setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1))} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition shadow-lg"><ArrowRight size={18} /></button>
            </div>
          </div>
        </div>

        {/* === ПЕРЕВАГИ B2B (WHY CHOOSE US) === */}
        <section className="py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: ShieldAlert, title: "Гарантія Якості", desc: "Сертефікована продукція та контроль кожного етапу" },
              { icon: Briefcase, title: "B2B Ціни", desc: "Спеціальні умови для оптових партнерів та компаній" },
              { icon: Monitor, title: "Власний Дизайн", desc: "Розробка унікального мерчу та брендування під ключ" },
              { icon: Coffee, title: "Швидка Доставка", desc: "Відправка замовлень день у день по всій Україні" },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-black dark:hover:border-white/20 transition-all duration-300 group">
                <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center mb-4 text-black dark:text-white group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                  <item.icon size={24} />
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>


        {/* === ОНОВЛЕНІ КАТЕГОРІЇ (DYNAMIC GRID) === */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">Каталог</h2>
              <p className="text-gray-500 dark:text-gray-400">Оберіть напрямок для вашого бізнесу</p>
            </div>
            <Link href="/catalog" className="hidden md:flex items-center gap-2 font-bold hover:gap-4 transition-all">
              Всі категорії <ArrowRight size={20} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 auto-rows-[180px] md:auto-rows-[240px]">
            {[
              {
                id: 'odiah',
                title: 'Одяг',
                desc: 'Худі, футболки',
                image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1000&auto=format&fit=crop',
                className: 'row-span-2 md:row-span-2',
              },
              {
                id: 'ofis',
                title: 'Офіс',
                desc: 'Блокноти, ручки',
                image: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?q=80&w=1000&auto=format&fit=crop', // Office Supplies
                className: 'md:col-span-2',
              },
              {
                id: 'elektronika',
                title: 'Електроніка',
                desc: 'Повербанки, гаджети',
                image: 'https://images.unsplash.com/photo-1760708825913-65a50b3dc39b?q=80&w=1000&auto=format&fit=crop', // Clear Powerbank
                className: 'md:col-span-1',
              },
              {
                id: 'bags',
                title: 'Сумки',
                desc: 'Рюкзаки, шопери',
                image: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=1000&auto=format&fit=crop', // Better framed backpack
                className: '',
              },
              {
                id: 'dim',
                title: 'Дім',
                desc: 'Чашки, термоси',
                image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=1000&auto=format&fit=crop',
                className: '',
              },
              {
                id: 'parasoli',
                title: 'Парасолі',
                desc: 'Крокуй під дощем',
                image: 'https://images.unsplash.com/photo-1541005460290-3bbe4ded5654?q=80&w=1000&auto=format&fit=crop', // Red Umbrella
                className: 'col-span-2 md:col-span-2',
              },
            ].map((cat) => (
              <div
                key={cat.id}
                onClick={() => router.push(`/catalog?category=${cat.id}`)}
                className={`relative rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer group ${cat.className}`}
              >
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300" />

                <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 flex items-end justify-between">
                  <div>
                    <h3 className="text-lg md:text-2xl font-black uppercase text-white mb-1 leading-none">
                      {cat.title}
                    </h3>
                    <p className="text-white/70 text-[10px] md:text-sm font-medium line-clamp-1">
                      {cat.desc}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all duration-300 shadow-lg">
                    <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === ХІТИ ТА НОВИНКИ (TABS STYLE) === */}
        <section className="py-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-8">
              <h2 className="text-3xl font-black uppercase">Trending</h2>
              <div className="hidden md:flex text-sm font-bold text-gray-400 gap-4">
                <button className="text-black dark:text-white border-b-2 border-black dark:border-white pb-1">Хіти Продажів</button>
                <button className="hover:text-black dark:hover:text-white transition-colors">Нові Надходження</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"><ArrowLeft size={18} /></button>
              <button className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"><ArrowRight size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product) => (
              <div key={product.id} className="h-full">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>

        {/* === WORKFLOW (ЯК ЦЕ ПРАЦЮЄ) === */}
        <section className="py-16 border-y border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] -mx-4 px-4 md:-mx-0 md:px-0 md:rounded-3xl">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-6">Створюємо <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">Ваш Бренд</span></h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Повний цикл виробництва мерчу: від розробки дизайну до доставки готової партії.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent -z-10"></div>

            {[
              { num: "01", title: "Заявка", desc: "Ви залишаєте заявку або обираєте товари в каталозі" },
              { num: "02", title: "Дизайн", desc: "Ми розробляємо макети та погоджуємо деталі" },
              { num: "03", title: "Виробництво", desc: "Нанесення логотипу та контроль якості партії" },
              { num: "04", title: "Доставка", desc: "Відправка готового замовлення кур'єром або поштою" },
            ].map((step, i) => (
              <div key={i} className="relative bg-background p-6 rounded-2xl border border-gray-100 dark:border-white/5 hover:-translate-y-2 transition-transform duration-300 shadow-xl shadow-black/5 dark:shadow-none">
                <div className="text-5xl font-black text-gray-100 dark:text-white/5 mb-4 absolute top-4 right-4">{step.num}</div>
                <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-bold text-xl mb-6 relative z-10 shadow-lg">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* === BRANDS / PARTNERS === */}
        <section className="py-12 overflow-hidden">
          <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Нам довіряють</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Fake Brands using Text for now */}
            <div className="text-2xl font-black font-serif italic">VOGUE</div>
            <div className="text-2xl font-black tracking-widest">NIKE</div>
            <div className="text-2xl font-black font-mono">ADIDAS</div>
            <div className="text-2xl font-black font-serif">PUMA</div>
            <div className="text-2xl font-black tracking-tighter">REEBOK</div>
          </div>
        </section>

        {/* === FAQ / CTA SECTION === */}
        <section className="relative rounded-3xl overflow-hidden bg-black dark:bg-white text-white dark:text-black overflow-hidden py-20 px-8">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] opacity-20 bg-cover bg-center"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-black uppercase leading-tight mb-6">Готові До <br />Співпраці?</h2>
              <p className="text-lg text-white/70 dark:text-black/70 mb-8">Отримайте індивідуальну комерційну пропозицію та доступ до B2B цін вже сьогодні.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/catalog" className="bg-white dark:bg-black text-black dark:text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform text-center">Перейти в каталог</Link>
                <button className="px-8 py-4 rounded-xl font-bold text-lg border-2 border-white/20 dark:border-black/10 hover:bg-white/10 dark:hover:bg-black/5 transition-colors">Зв'язатись з менеджером</button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-8 md:gap-12">
              <div>
                <div className="text-4xl md:text-5xl font-black mb-2">500+</div>
                <div className="text-sm text-white/50 dark:text-black/50 font-bold uppercase">Партнерів</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-black mb-2">30k</div>
                <div className="text-sm text-white/50 dark:text-black/50 font-bold uppercase">Товарів на складі</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-black mb-2">24h</div>
                <div className="text-sm text-white/50 dark:text-black/50 font-bold uppercase">Відправка зразків</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-50 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-white/10 py-12 mt-12 transition-colors duration-300">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; 2025 REBRAND STUDIO. Всі права захищено.</p>
        </div>
      </footer>

      <CartDrawer />
    </div>
  );
}