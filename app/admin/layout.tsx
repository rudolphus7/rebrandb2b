"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, ShoppingBag, Layers, Image as ImageIcon, 
  Settings, LogOut, RefreshCw, Package, Gift, Users, UserCircle, Loader2, ShieldAlert
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const MENU_ITEMS = [
  { name: "Головна", href: "/admin", icon: LayoutDashboard },
  { name: "Замовлення", href: "/admin/orders", icon: Package },
  { name: "Клієнти", href: "/admin/customers", icon: Users },
  { name: "Товари", href: "/admin/products", icon: ShoppingBag },
  { name: "Категорії", href: "/admin/categories", icon: Layers },
  { name: "Лояльність", href: "/admin/loyalty", icon: Gift },
  { name: "Банери & Слайдер", href: "/admin/banners", icon: ImageIcon },
  { name: "Синхронізація (1C/XML)", href: "/admin/sync", icon: RefreshCw },
  { name: "Налаштування", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Стани
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#111] border-r border-white/10 flex flex-col fixed h-full left-0 top-0 overflow-y-auto z-50">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="text-2xl font-black italic tracking-tighter text-white block">
            REBRAND <span className="text-xs font-normal text-blue-500 not-italic align-top">CORE</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 bg-[#1a1a1a]">
          {/* Інформація про адміна */}
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400">
                  <ShieldAlert size={18} />
              </div>
              <div className="overflow-hidden">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Administrator</p>
                  <p className="text-xs font-bold text-white truncate w-32" title={userEmail}>{userEmail}</p>
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
      <main className="flex-1 ml-64 p-8 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}