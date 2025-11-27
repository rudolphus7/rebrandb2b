"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  User, Package, Star, MapPin, LogOut, ArrowLeft, 
  Settings, CreditCard, Gift, ShieldCheck, Camera 
} from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

export default function UserProfile() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Вкладки
  const [activeTab, setActiveTab] = useState("profile"); // profile | orders | loyalty | settings

  // Дані
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({
    full_name: "",
    company_name: "",
    phone: "",
    birthday: "",
    bonus_points: 0,
    tier: "Silver"
  });

  // Стан завантаження збереження
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/");
      } else {
        setSession(session);
        fetchData(session);
      }
    });
  }, []);

  async function fetchData(currentSession: any) {
    const userId = currentSession.user.id;
    const email = currentSession.user.email;

    // 1. Отримуємо профіль
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // 2. Отримуємо замовлення
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_email", email)
      .order("created_at", { ascending: false });

    setOrders(ordersData || []);
    setLoading(false);
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      full_name: profile.full_name,
      company_name: profile.company_name,
      phone: profile.phone,
      birthday: profile.birthday || null,
      // Бонуси користувач сам собі не міняє, вони підтягуються з бази (або дефолт)
    });

    if (error) {
      alert("Помилка збереження: " + error.message);
    } else {
      alert("Профіль оновлено!");
    }
    setIsSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // --- UI КОМПОНЕНТИ ---

  const getStatusBadge = (status: string) => {
    const styles: any = {
      new: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      shipped: "bg-green-500/10 text-green-500 border-green-500/20",
      canceled: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    const labels: any = { new: "Обробка", processing: "В роботі", shipped: "Відправлено", canceled: "Скасовано" };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.new}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Завантаження даних...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-600/30 flex">
      
      {/* === ЛІВА НАВІГАЦІЯ (SIDEBAR) === */}
      <aside className="w-20 lg:w-72 border-r border-white/10 bg-zinc-950/50 backdrop-blur fixed h-full flex flex-col z-20">
        <div className="p-6 h-24 flex items-center border-b border-white/10">
           <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
             {profile.full_name ? profile.full_name[0] : "U"}
           </div>
           <div className="ml-4 hidden lg:block">
             <div className="font-bold text-sm truncate w-40">{profile.full_name || "Гість"}</div>
             <div className="text-xs text-zinc-500 truncate w-40">{session.user.email}</div>
           </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "profile", icon: User, label: "Мій Профіль" },
            { id: "orders", icon: Package, label: "Історія Замовлень" },
            { id: "loyalty", icon: Gift, label: "Бонуси & Tier" },
            // { id: "settings", icon: Settings, label: "Налаштування" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition duration-300 text-sm font-bold uppercase tracking-wide
                ${activeTab === item.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"
                }`}
            >
              <item.icon size={18} />
              <span className="hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button onClick={() => router.push("/")} className="w-full flex items-center gap-3 p-3 rounded-xl text-zinc-500 hover:text-white transition text-sm font-bold">
            <ArrowLeft size={18} /> <span className="hidden lg:block">В магазин</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition text-sm font-bold">
            <LogOut size={18} /> <span className="hidden lg:block">Вийти</span>
          </button>
        </div>
      </aside>

      {/* === ПРАВА ЧАСТИНА (CONTENT) === */}
      <main className="flex-1 ml-20 lg:ml-72 p-6 lg:p-12">
        
        {/* Анімація перемикання вкладок */}
        <div className="max-w-4xl mx-auto">
          
          {/* --- ВКЛАДКА: ПРОФІЛЬ --- */}
          {activeTab === "profile" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold mb-2">Налаштування профілю</h1>
              <p className="text-zinc-500 mb-8">Керуйте інформацією про ваш бізнес та контактами.</p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Аватар і Статус */}
                <div className="lg:col-span-1">
                  <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center">
                    <div className="w-24 h-24 mx-auto bg-zinc-800 rounded-full flex items-center justify-center mb-4 relative group cursor-pointer overflow-hidden">
                       <User size={40} className="text-zinc-500"/>
                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                         <Camera size={20}/>
                       </div>
                    </div>
                    <h3 className="font-bold text-lg">{profile.tier} Member</h3>
                    <p className="text-zinc-500 text-xs mt-1">Рівень лояльності</p>
                    <div className="mt-4 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full w-[40%]"></div>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2 text-right">400 / 1000 балів</p>
                  </div>
                </div>

                {/* Форма */}
                <div className="lg:col-span-2">
                  <form onSubmit={updateProfile} className="bg-zinc-900 border border-white/10 rounded-2xl p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">ПІБ / Контактна особа</label>
                        <input type="text" value={profile.full_name || ""} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="Іван Іванов"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Назва компанії (Бренд)</label>
                        <input type="text" value={profile.company_name || ""} onChange={e => setProfile({...profile, company_name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="Brandzilla LLC"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Телефон</label>
                        <input type="text" value={profile.phone || ""} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="+380..."/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">День народження</label>
                        <input type="date" value={profile.birthday || ""} onChange={e => setProfile({...profile, birthday: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"/>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10 flex justify-end">
                      <button disabled={isSaving} className="bg-white text-black hover:bg-blue-500 hover:text-white px-8 py-3 rounded-lg font-bold text-sm uppercase tracking-widest transition duration-300">
                        {isSaving ? "Збереження..." : "Зберегти зміни"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- ВКЛАДКА: ЗАМОВЛЕННЯ --- */}
          {activeTab === "orders" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold mb-2">Історія замовлень</h1>
              <p className="text-zinc-500 mb-8">Відслідковуйте статус ваших B2B поставок.</p>

              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-white/10 border-dashed">
                    <Package size={48} className="mx-auto text-zinc-700 mb-4"/>
                    <p className="text-zinc-500">Ви ще не робили замовлень</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="bg-zinc-900 border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition duration-300 group">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                             <span className="font-mono text-blue-500 font-bold">#{order.id.toString().slice(0,8)}</span>
                             {getStatusBadge(order.status || 'new')}
                          </div>
                          <div className="text-xs text-zinc-500 uppercase tracking-wide">
                            {order.created_at ? format(new Date(order.created_at), 'd MMMM yyyy', { locale: uk }) : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-zinc-400 text-sm mr-2">Сума:</span>
                          <span className="text-2xl font-mono font-bold">{order.total_price} ₴</span>
                        </div>
                      </div>

                      {/* Список товарів (міні) */}
                      <div className="bg-black/50 rounded-lg p-4 grid gap-2">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                             <span className="text-zinc-300">{item.title}</span>
                             <span className="font-mono text-zinc-500">{item.price} ₴</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 flex gap-2 justify-end">
                        <button className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition">Повторити замовлення</button>
                        <span className="text-zinc-700">|</span>
                        <button className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-blue-500 transition">Завантажити рахунок</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* --- ВКЛАДКА: БОНУСИ --- */}
          {activeTab === "loyalty" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold mb-2">Програма лояльності</h1>
              <p className="text-zinc-500 mb-8">Накопичуйте бали та отримуйте знижки на друк.</p>

              {/* Головна картка */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 to-purple-900 p-8 md:p-12 text-center md:text-left mb-8 border border-white/10">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-2">Ваш баланс</h2>
                    <div className="text-6xl font-black tracking-tighter text-white mb-2">
                      {profile.bonus_points} <span className="text-2xl font-medium text-white/50">pts</span>
                    </div>
                    <p className="text-blue-200/80 text-sm">≈ {profile.bonus_points * 0.5} грн знижки на наступне замовлення</p>
                  </div>
                  
                  <div className="bg-black/30 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full md:w-auto min-w-[250px]">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-lg">{profile.tier}</span>
                      <Star fill="gold" className="text-yellow-500"/>
                    </div>
                    <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mb-2">
                       <div className="bg-yellow-500 h-full w-[40%] shadow-[0_0_10px_gold]"></div>
                    </div>
                    <p className="text-xs text-zinc-400 text-center">Ще 600 балів до Gold</p>
                  </div>
                </div>
              </div>

              {/* Як це працює */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900 p-6 rounded-xl border border-white/10">
                   <CreditCard className="text-blue-500 mb-4" size={32}/>
                   <h3 className="font-bold mb-2">Купуйте</h3>
                   <p className="text-sm text-zinc-500">Отримуйте 5% кешбеку балами з кожного замовлення.</p>
                </div>
                <div className="bg-zinc-900 p-6 rounded-xl border border-white/10">
                   <ShieldCheck className="text-purple-500 mb-4" size={32}/>
                   <h3 className="font-bold mb-2">Накопичуйте</h3>
                   <p className="text-sm text-zinc-500">Бали не згорають і сумуються з акціями.</p>
                </div>
                <div className="bg-zinc-900 p-6 rounded-xl border border-white/10">
                   <Gift className="text-green-500 mb-4" size={32}/>
                   <h3 className="font-bold mb-2">Витрачайте</h3>
                   <p className="text-sm text-zinc-500">Оплачуйте до 50% вартості мерчу балами.</p>
                </div>
              </div>

            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}