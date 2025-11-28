"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, ShoppingBag, Layers, Image as ImageIcon, 
  Settings, LogOut, RefreshCw, Package, Gift // Додали іконку Gift
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const MENU_ITEMS = [
  { name: "Головна", href: "/admin", icon: LayoutDashboard },
  { name: "Замовлення", href: "/admin/orders", icon: Package },
  { name: "Товари", href: "/admin/products", icon: ShoppingBag },
  { name: "Категорії", href: "/admin/categories", icon: Layers },
  { name: "Лояльність", href: "/admin/loyalty", icon: Gift }, // Новий пункт
  { name: "Банери & Слайдер", href: "/admin/banners", icon: ImageIcon },
  { name: "Синхронізація (1C/XML)", href: "/admin/sync", icon: RefreshCw },
  { name: "Налаштування", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

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

        <div className="p-4 border-t border-white/10">
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