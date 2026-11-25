'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Briefcase,
  Coffee, Monitor, ShieldAlert, LogOut, Palette
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthContext";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { BRANDING_SERVICES } from "@/lib/servicesData";

export const DEFAULT_SLIDES = [
  {
    id: 1,
    title: "НОВА КОЛЕКЦІЯ",
    subtitle: "WINTER 2025",
    description: "Оверсайз худі з преміум бавовни. Ідеально під нанесення.",
    image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop",
    link: "/catalog",
  },
  {
    id: 2,
    title: "КОРПОРАТИВНИЙ",
    subtitle: "МЕРЧ",
    description: "Одягніть команду в якість. Знижки для B2B до -30%.",
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2000&auto-format&fit=crop",
    link: "/catalog",
  }
];

const BUSINESS_SOLUTIONS = [
  {
    title: "КАФЕ ТА КАВ'ЯРНІ",
    items: "Фартухи, чашки, футболки",
    image: "/images/businesses/biz-cafe.jpg",
    href: "/catalog?category=dim",
  },
  {
    title: "САЛОНИ КРАСИ",
    items: "Худі, косметички, рушники",
    image: "/images/businesses/biz-beauty.jpg",
    href: "/catalog?category=odiah",
  },
  {
    title: "СТОМАТОЛОГІЇ\nТА КЛІНІКИ",
    items: "Поло, блокноти, ручки",
    image: "/images/businesses/biz-dental.jpg",
    href: "/catalog?category=ofis",
  },
  {
    title: "IT-КОМПАНІЇ ТА ОФІСИ",
    items: "Худі, термокружки, шопери",
    image: "/images/businesses/biz-it.jpg",
    href: "/catalog?category=elektronika",
  },
  {
    title: "ФІТНЕС ТА СПОРТ",
    items: "Футболки, пляшки, рюкзаки",
    image: "/images/businesses/biz-fitness.jpg",
    href: "/catalog?category=odiah",
  },
  {
    title: "АВТОБІЗНЕС ТА СЕРВІС",
    items: "Поло, кепки, інструменти",
    image: "/images/businesses/biz-auto.jpg",
    href: "/catalog?category=odiah",
  },
  {
    title: "РЕСТОРАНИ ТА ГОТЕЛІ",
    items: "Уніформа, фартухи, посуд",
    image: "/images/businesses/biz-horeca.jpg",
    href: "/catalog?category=dim",
  },
  {
    title: "ІВЕНТИ ТА МАРКЕТИНГ",
    items: "Світшоти, шопери, бейджі",
    image: "/images/businesses/biz-events.jpg",
    href: "/catalog?category=bags",
  },
];

interface HomeClientProps {
  initialHits: any[];
  initialNews: any[];
  initialShowcase?: any[];
  initialBanners: any[];
}

export default function HomeClient({
  initialHits,
  initialNews,
  initialShowcase = [],
  initialBanners,
}: HomeClientProps) {
  const { user: sessionUser } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [hits] = useState<any[]>(initialHits);
  const [news] = useState<any[]>(initialNews);
  const [activeTab, setActiveTab] = useState<'hit' | 'new'>('hit');
  const [carouselOffset, setCarouselOffset] = useState(0);
  const [banners] = useState<any[]>(initialBanners.length > 0 ? initialBanners : DEFAULT_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!sessionUser) {
      setIsVerified(null);
      return;
    }
    let mounted = true;
    supabase
      .from('profiles')
      .select('is_verified')
      .eq('id', sessionUser.id)
      .single()
      .then(({ data: profile }) => {
        if (mounted) {
          setIsVerified(profile ? profile.is_verified : false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [sessionUser]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev >= banners.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    setCarouselOffset(0);
  }, [activeTab]);

  const currentProducts = activeTab === 'hit' ? hits : news;
  const VISIBLE_COUNT = 4;

  const nextSlide = () => {
    if (carouselOffset + VISIBLE_COUNT < currentProducts.length) {
      setCarouselOffset((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (carouselOffset > 0) {
      setCarouselOffset((prev) => prev - 1);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsVerified(null);
  };

  if (sessionUser && isVerified === false) {
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
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-white bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl transition"
          >
            <LogOut size={18} /> Вийти
          </button>
        </div>
      </div>
    );
  }

  const currentBanner = banners[currentSlide];
  if (!currentBanner) return null;

  const showcaseProducts = initialShowcase.length > 0 ? initialShowcase : [...hits, ...news].slice(0, 8);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-colors duration-300">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 md:py-8 space-y-14 md:space-y-20">
        {/* === СЛАЙДЕР === */}
        <div className="relative w-full h-[320px] md:h-[430px] bg-gray-100 dark:bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/5 group">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0"
            >
              <div className="absolute inset-0">
                {currentBanner.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentBanner.image_url}
                    alt={currentBanner.title || "REBRAND STUDIO"}
                    fetchPriority="high"
                    decoding="async"
                    className="w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#111]/75 to-transparent"></div>
              </div>

              <div className="absolute inset-0 flex items-center">
                <div className="px-6 md:px-16 w-full max-w-3xl">
                  <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="inline-block border border-white/20 text-gray-300 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider bg-black/30 backdrop-blur-md">REBRAND STUDIO B2B</motion.div>
                  <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-3xl sm:text-4xl md:text-6xl font-black leading-none mb-2 text-white uppercase">{currentBanner.title}</motion.h2>
                  <motion.h3 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-2xl sm:text-3xl md:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase">{currentBanner.subtitle}</motion.h3>
                  <p className="text-gray-300 text-sm md:text-lg mb-6 max-w-lg line-clamp-2">{currentBanner.description}</p>
                  <div className="flex flex-wrap gap-3">
                    <Link href={currentBanner.link || "/catalog"} className="bg-white text-black font-bold px-6 md:px-8 py-3 rounded-xl hover:bg-gray-200 transition inline-flex items-center gap-2 text-sm md:text-base">
                      Перейти в каталог <ArrowRight size={18} />
                    </Link>
                    <Link href="/CONSTRUCTOR" className="bg-blue-600 text-white font-bold px-6 md:px-8 py-3 rounded-xl hover:bg-blue-500 transition inline-flex items-center gap-2 text-sm md:text-base shadow-lg">
                      <Palette size={18} /> Конструктор
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-6 right-6 flex items-center gap-4 z-20">
            <div className="flex gap-2">
              <button onClick={() => setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1))} aria-label="Попередній слайд" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition"><ArrowLeft size={18} /></button>
              <button onClick={() => setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1))} aria-label="Наступний слайд" className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition shadow-lg"><ArrowRight size={18} /></button>
            </div>
          </div>
        </div>

        {/* === РІШЕННЯ ДЛЯ РІЗНИХ БІЗНЕСІВ (ЯСКРАВА 4-КОЛОНКОВА СІТКА) === */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Галузеві підбірки
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight mt-1">
                Нанесення логотипів для вашого бізнесу
              </h1>
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">
                Оберіть сферу діяльності — ми підготували рішення для команд, закладів та брендів
              </p>
            </div>
            <Link href="/catalog" className="inline-flex items-center gap-2 font-bold text-sm hover:gap-3 transition-all shrink-0 text-blue-600 dark:text-blue-400">
              Весь каталог <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
            {BUSINESS_SOLUTIONS.map((biz) => (
              <Link
                key={biz.title}
                href={biz.href}
                className="group relative aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 block bg-zinc-900"
              >
                <Image
                  src={biz.image}
                  alt={`${biz.title} — ${biz.items}`}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-5 text-center">
                  <h2 className="whitespace-pre-line text-sm sm:text-base md:text-lg font-black uppercase tracking-wide text-white underline underline-offset-4 decoration-2 decoration-white/70 group-hover:decoration-blue-400 transition-colors">
                    {biz.title}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-white/80 font-medium mt-1.5 line-clamp-1">
                    {biz.items}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* === Trending === */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6 md:gap-8">
              <h2 className="text-2xl md:text-3xl font-black uppercase">Trending</h2>
              <div className="flex text-xs md:text-sm font-bold text-gray-400 gap-4">
                <button onClick={() => setActiveTab('hit')} className={`border-b-2 transition-colors pb-1 ${activeTab === 'hit' ? 'text-black dark:text-white border-black dark:border-white' : 'border-transparent hover:text-black dark:hover:text-white'}`}>Хіти Продажів</button>
                <button onClick={() => setActiveTab('new')} className={`border-b-2 transition-colors pb-1 ${activeTab === 'new' ? 'text-black dark:text-white border-black dark:border-white' : 'border-transparent hover:text-black dark:hover:text-white'}`}>Нові Надходження</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={prevSlide} disabled={carouselOffset === 0} aria-label="Попередні товари" className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition disabled:opacity-30 disabled:cursor-not-allowed"><ArrowLeft size={18} /></button>
              <button onClick={nextSlide} disabled={carouselOffset + VISIBLE_COUNT >= currentProducts.length} aria-label="Наступні товари" className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition disabled:opacity-30 disabled:cursor-not-allowed"><ArrowRight size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {currentProducts.length > 0 ? (
              currentProducts.slice(carouselOffset, carouselOffset + VISIBLE_COUNT).map((product) => (
                <div key={product.id} className="h-full">
                  <ProductCard product={product} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-400">Немає товарів у цій категорії</div>
            )}
          </div>
        </section>

        {/* === МЕТОДИ НАНЕСЕННЯ ЛОГОТИПІВ === */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Технології брендування</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Власне виробництво: підбираємо метод нанесення під тканину та тираж
              </p>
            </div>
            <Link href="/posluhy" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0">
              Порівняти всі методи <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {BRANDING_SERVICES.map((service) => (
              <Link
                key={service.slug}
                href={`/posluhy/${service.slug}`}
                className="group rounded-2xl overflow-hidden bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 hover:border-blue-500/50 transition-all flex flex-col"
              >
                <div className="h-32 sm:h-40 overflow-hidden bg-zinc-900 relative">
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-white">
                    {service.minBatch}
                  </span>
                </div>
                <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{service.shortDesc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* === ПЕРЕВАГИ === */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              { icon: ShieldAlert, title: "Гарантія Якості", desc: "Сертифікована продукція та контроль кожного етапу" },
              { icon: Briefcase, title: "B2B Ціни", desc: "Спеціальні умови для оптових партнерів та компаній" },
              { icon: Monitor, title: "Власний Дизайн", desc: "Розробка унікального мерчу та брендування під ключ" },
              { icon: Coffee, title: "Швидка Доставка", desc: "Відправка замовлень по всій Україні" },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-[#111] p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-black dark:hover:border-white/20 transition-all duration-300 group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center mb-3 sm:mb-4 text-black dark:text-white group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors"><item.icon size={22} /></div>
                <h3 className="font-bold text-sm sm:text-lg mb-1.5">{item.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* === РІЗНІ ТОВАРИ ПІД НАНЕСЕННЯ (ВНИЗУ НА ГОЛОВНІЙ) === */}
        {showcaseProducts.length > 0 && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                  Товари під нанесення логотипу
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Популярні позиції з нашого каталогу для брендування та корпоративних наборів
                </p>
              </div>
              <Link href="/catalog" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0">
                Дивитись весь каталог <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {showcaseProducts.map((product) => (
                <div key={`showcase-${product.id}`} className="h-full">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* === FAQ === */}
        <section className="py-10 border-t border-gray-200 dark:border-white/10 space-y-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-center">Часті питання про нанесення логотипів</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  q: 'На які товари можна нанести логотип?',
                  a: 'Ми наносимо логотипи на футболки, худі, світшоти, поло, куртки, кепки, шопери, рюкзаки, термокружки, пляшки та корпоративні сувеніри з каталогу.',
                },
                {
                  q: 'Який спосіб нанесення логотипу обрати?',
                  a: 'Для повноколірних макетів і невеликих партій підходить DTF-друк, для преміального мерчу — машинна вишивка, а для великих тиражів — шовкографія.',
                },
                {
                  q: 'Як побачити B2B-ціни та оформити замовлення?',
                  a: 'Перегляд каталогу та онлайн-конструктор відкриті для всіх, а оптові ціни й оформлення замовлення доступні одразу після входу в B2B-кабінет.',
                },
                {
                  q: 'Чи можна подивитися макет перед друком?',
                  a: 'Так, ви можете завантажити логотип і приміряти його на товар самостійно в нашому онлайн-конструкторі або отримати візуалізацію від менеджера.',
                },
              ].map((faq) => (
                <div
                  key={faq.q}
                  className="p-5 rounded-xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10"
                >
                  <h3 className="text-sm font-bold mb-1.5">{faq.q}</h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: 'На які товари можна нанести логотип?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Ми наносимо логотипи на футболки, худі, світшоти, поло, куртки, кепки, шопери, рюкзаки, термокружки, пляшки та корпоративні сувеніри з каталогу REBRAND STUDIO.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Який спосіб нанесення логотипу обрати?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Для повноколірних макетів і невеликих партій підходить DTF-друк, для преміального мерчу — машинна вишивка, а для великих оптових тиражів — шовкографія.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Як побачити B2B-ціни та оформити замовлення?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Перегляд каталогу та онлайн-конструктор відкриті для всіх, а оптові ціни й оформлення замовлення доступні одразу після входу в B2B-кабінет.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Чи можна подивитися макет перед друком?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Так, ви можете завантажити логотип і приміряти його на товар самостійно в нашому онлайн-конструкторі або отримати візуалізацію від менеджера.',
                    },
                  },
                ],
              }),
            }}
          />

          {/* === SEO ПЕРЕЛІНКОВКА ТА ПОПУЛЯРНІ НАПРЯМКИ === */}
          <div className="pt-8 border-t border-gray-200 dark:border-white/10 space-y-3">
            <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
              Корпоративний мерч, сувеніри та нанесення логотипів по Україні
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-5xl">
              REBRAND STUDIO — оптове виробництво брендованої продукції та нанесення логотипів на одяг, аксесуари й бізнес-сувеніри.
              Швидкий перехід до популярних запитів і категорій:
            </p>
            <div className="max-h-36 overflow-y-auto pr-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-[#111] p-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Футболки з логотипом оптом', href: '/catalog?category=odiah' },
                  { label: 'Худі та світшоти з принтом', href: '/catalog?category=odiah' },
                  { label: 'Поло з вишивкою логотипу', href: '/catalog?category=odiah' },
                  { label: 'Кепки та бейсболки з лого', href: '/catalog?category=odiah' },
                  { label: 'Фартухи з логотипом для кафе', href: '/catalog?category=odiah' },
                  { label: 'Корпоративна уніформа з лого', href: '/catalog?category=odiah' },
                  { label: 'Бейджі з логотипом', href: '/catalog?category=ofis' },
                  { label: 'Ручки з логотипом оптом', href: '/catalog?category=ofis' },
                  { label: 'Блокноти та щоденники з лого', href: '/catalog?category=ofis' },
                  { label: 'Шнурки (лан’ярди) з логотипом', href: '/catalog?category=ofis' },
                  { label: 'Силіконові браслети з лого', href: '/catalog?q=%D0%B1%D1%80%D0%B0%D1%81%D0%BB%D0%B5%D1%82' },
                  { label: 'Шопери та еко-сумки з принтом', href: '/catalog?category=bags' },
                  { label: 'Рюкзаки з нанесенням логотипу', href: '/catalog?category=bags' },
                  { label: 'Бананки та сумки під друк', href: '/catalog?category=bags' },
                  { label: 'Чашки та кружки з логотипом', href: '/catalog?category=dim' },
                  { label: 'Термокружки й термоси з лого', href: '/catalog?category=dim' },
                  { label: 'Пляшки для води з принтом', href: '/catalog?category=dim' },
                  { label: 'Пледи та рушники з вишивкою', href: '/catalog?category=dim' },
                  { label: 'Павербанки з логотипом', href: '/catalog?category=elektronika' },
                  { label: 'Флешки та гаджети з нанесенням', href: '/catalog?category=elektronika' },
                  { label: 'Парасолі з логотипом оптом', href: '/catalog?category=parasoli' },
                  { label: 'Дощовики з брендуванням', href: '/catalog?category=parasoli' },
                  { label: 'Упаковка та пакети з логотипом', href: '/catalog?category=upakovka' },
                  { label: 'Корпоративні подарунки B2B', href: '/catalog?label=hit' },
                  { label: 'Мерч для IT-компаній', href: '/catalog?category=odiah' },
                  { label: 'Брендування для салонів краси', href: '/catalog?category=dim' },
                  { label: 'Сувеніри для стоматологій та клінік', href: '/catalog?category=ofis' },
                  { label: 'Мерч для івентів та конференцій', href: '/catalog?category=bags' },
                  { label: 'DTF-друк на одязі та тканині', href: '/posluhy/dtf-druk' },
                  { label: 'Машинна вишивка на замовлення', href: '/posluhy/mashynna-vyshyvka' },
                  { label: 'Шовкографія на футболках оптом', href: '/posluhy/shovkografiya' },
                  { label: 'Термотрансферний друк логотипів', href: '/posluhy/termotransfer' },
                  { label: 'Усі методи нанесення логотипу', href: '/posluhy' },
                  { label: 'Онлайн-конструктор брендування', href: '/CONSTRUCTOR' },
                  { label: 'Новинки під нанесення', href: '/catalog?label=new' },
                  { label: 'Акційні товари B2B', href: '/catalog?label=promo' },
                ].map((link, idx) => (
                  <Link
                    key={`${idx}-${link.label}`}
                    href={link.href}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-50 dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-white/10 py-12 mt-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} REBRAND STUDIO. Всі права захищено.</p>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
            <Link href="/catalog" className="hover:text-foreground transition-colors">Каталог</Link>
            <Link href="/posluhy" className="hover:text-foreground transition-colors">Послуги нанесення</Link>
            <Link href="/posluhy/dtf-druk" className="hover:text-foreground transition-colors">DTF-друк</Link>
            <Link href="/posluhy/mashynna-vyshyvka" className="hover:text-foreground transition-colors">Вишивка</Link>
            <Link href="/CONSTRUCTOR" className="hover:text-foreground transition-colors">Конструктор</Link>
          </nav>
        </div>
      </footer>
      <CartDrawer />
    </div>
  );
}
