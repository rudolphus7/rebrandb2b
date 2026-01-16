"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Layers, Image as ImageIcon,
  Settings, LogOut, RefreshCw, Package, Gift, Users, UserCircle, Loader2, ShieldAlert, Heart, FileText, MessageSquare, Menu, X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const MENU_ITEMS = [
  { name: "Головна", href: "/admin", icon: LayoutDashboard },
  { name: "Замовлення", href: "/admin/orders", icon: Package },
  { name: "Клієнти", href: "/admin/customers", icon: Users },
  { name: "Товари", href: "/admin/products", icon: ShoppingBag },
  { name: "Категорії", href: "/admin/categories", icon: Layers },
  { name: "Промо Сторінки", href: "/admin/pages", icon: FileText },
  { name: "Поп-апи", href: "/admin/popups", icon: MessageSquare },
  { name: "Лояльність", href: "/admin/loyalty", icon: Gift },
  { name: "Банери & Слайдер", href: "/admin/banners", icon: ImageIcon },
  { name: "Синхронізація (1C/XML)", href: "/admin/sync", icon: RefreshCw },
  { name: "Оглянути Wishlist", href: "/admin/wishlist", icon: Heart },
  { name: "Налаштування", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Стани
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // 1. Перевіряємо сесію
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("No session");
        }

        // 2. ПЕРЕВІРЯЄМО РОЛЬ У БАЗІ ДАНИХ (Замість хардкоду email)
        // Ми робимо запит до профілю поточного юзера
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !profile || profile.role !== 'admin') {
          console.warn("Access denied: User is not an admin");
          throw new Error("Not admin");
        }

        // Якщо дійшли сюди - це адмін
        setUserEmail(session.user.email || "Admin");
        setIsAuthorized(true);

      } catch (e) {
        // Якщо не адмін - редірект на головну
        router.replace("/");
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // 1. Екран завантаження (перевірка прав)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 size={48} className="animate-spin text-blue-600" />
        <p className="text-zinc-500 text-sm uppercase tracking-widest">Перевірка доступу...</p>
      </div>
    );
  }

  // 2. Якщо доступу немає (хоча useEffect вже мав зробити редірект)
  if (!isAuthorized) {
    return null;
  }

  // 3. Інтерфейс Адмінки
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white flex flex-col md:flex-row font-sans transition-colors duration-300">

      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white dark:bg-[#111] border-b border-gray-200 dark:border-white/10 p-4 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="text-xl font-black italic tracking-tighter text-black dark:text-white">
          REBRAND <span className="text-xs font-normal text-blue-600 dark:text-blue-500 not-italic align-top">CORE</span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* BACKDROP */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#111] border-r border-gray-200 dark:border-white/10 
          flex flex-col transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative md:h-screen md:sticky md:top-0
      `}>
        <div className="p-6 border-b border-white/10 hidden md:block">
          <Link href="/" className="text-2xl font-black italic tracking-tighter text-black dark:text-white block">
            REBRAND <span className="text-xs font-normal text-blue-600 dark:text-blue-500 not-italic align-top">CORE</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Mobile header inside sidebar for close button */}
          <div className="md:hidden flex justify-between items-center mb-6 pl-2">
            <span className="font-bold text-gray-400">Меню</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500">
              <X size={20} />
            </button>
          </div>

          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
                  }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a1a] transition-colors duration-300">
          {/* Інформація про адміна */}
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400">
              <ShieldAlert size={18} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Administrator</p>
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate w-32" title={userEmail}>{userEmail}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/10 w-full transition"
          >
            <LogOut size={20} />
            Вихід
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}