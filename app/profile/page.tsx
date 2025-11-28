"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Package, Star, MapPin, LogOut, ArrowLeft, 
  Settings, CreditCard, Gift, ShieldCheck, Camera, 
  ChevronDown, ChevronUp, Clock, Truck, Plus, Minus
} from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import ProductImage from "../components/ProductImage";
import { LOYALTY_TIERS, getCurrentTier, getNextTier } from "@/lib/loyaltyUtils";

export default function UserProfile() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [orders, setOrders] = useState<any[]>([]);
  const [loyaltyLogs, setLoyaltyLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({
    full_name: "",
    company_name: "",
    phone: "",
    birthday: "",
    bonus_points: 0,
    total_spent: 0
  });

  const [isSaving, setIsSaving] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

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

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
    const { data: ordersData } = await supabase.from("orders").select("*").eq("user_email", email).order("created_at", { ascending: false });
    const { data: logsData } = await supabase.from("loyalty_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false });

    const calculatedPoints = logsData ? logsData.reduce((acc: number, log: any) => acc + (log.type === 'earn' ? log.amount : -log.amount), 0) : 0;
    const totalSpentMoney = ordersData ? ordersData.reduce((acc: number, o: any) => acc + (o.total_price || 0), 0) : 0;

    setProfile({ 
        ...profileData, 
        bonus_points: calculatedPoints,
        total_spent: totalSpentMoney
    });
    
    setOrders(ordersData || []);
    setLoyaltyLogs(logsData || []);
    setLoading(false);
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      company_name: profile.company_name,
      phone: profile.phone,
      birthday: profile.birthday || null,
    }).eq('id', session.user.id);

    if (error) alert("Помилка: " + error.message);
    else alert("Дані збережено успішно!");
    setIsSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const currentTier = getCurrentTier(profile.total_spent);
  const nextTier = getNextTier(profile.total_spent);
  
  let progressPercent = 100;
  if (nextTier) {
      const prevThreshold = currentTier.threshold;
      const nextThreshold = nextTier.threshold;
      const currentProgress = profile.total_spent - prevThreshold;
      const totalNeeded = nextThreshold - prevThreshold;
      progressPercent = Math.min(100, Math.max(0, (currentProgress / totalNeeded) * 100));
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Завантаження...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex">
      {/* SIDEBAR */}
      <aside className="w-20 lg:w-72 border-r border-white/10 bg-zinc-950/50 backdrop-blur fixed h-full flex flex-col z-20">
        <div className="p-6 h-24 flex items-center border-b border-white/10">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg bg-gradient-to-br ${currentTier.bg}`}>
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
            { id: "addresses", icon: MapPin, label: "Адреси доставки" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition duration-300 text-sm font-bold uppercase tracking-wide
                ${activeTab === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-zinc-500 hover:bg-white/5 hover:text-white"}`}
            >
              <item.icon size={18} />
              <span className="hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <button onClick={() => router.push("/")} className="w-full flex items-center gap-3 p-3 rounded-xl text-zinc-500 hover:text-white transition text-sm font-bold"><ArrowLeft size={18} /> <span className="hidden lg:block">В магазин</span></button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition text-sm font-bold"><LogOut size={18} /> <span className="hidden lg:block">Вийти</span></button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 ml-20 lg:ml-72 p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          {/* --- ПРОФІЛЬ --- */}
          {activeTab === "profile" && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
               <h1 className="text-3xl font-bold mb-2">Особисті дані</h1>
               <p className="text-zinc-500 mb-8">Ця інформація буде автоматично підставлятися при оформленні замовлень.</p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Картка статусу */}
                <div className="lg:col-span-1">
                  <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${currentTier.bg}`}></div>
                    <div className="w-24 h-24 mx-auto bg-zinc-800 rounded-full flex items-center justify-center mb-4 relative group cursor-pointer overflow-hidden border-2 border-zinc-700">
                        {profile.image_url ? (
                            <img src={profile.image_url} className="w-full h-full object-cover" alt="Avatar"/>
                        ) : (
                            <User size={40} className="text-zinc-500"/>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Camera size={20}/>
                        </div>
                    </div>
                    <h3 className={`font-black text-2xl uppercase ${currentTier.color}`}>{currentTier.name}</h3>
                    <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Рівень клієнта</p>
                  </div>
                </div>

                {/* Форма */}
                <div className="lg:col-span-2">
                  <form onSubmit={updateProfile} className="bg-zinc-900 border border-white/10 rounded-2xl p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">ПІБ</label>
                        <input type="text" value={profile.full_name || ""} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="Іван Іванов"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Компанія (Необов'язково)</label>
                        <input type="text" value={profile.company_name || ""} onChange={e => setProfile({...profile, company_name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="Brandzilla LLC"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Телефон</label>
                        <input type="text" value={profile.phone || ""} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="+380..."/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Email (Login)</label>
                        <input type="email" value={session.user.email} disabled className="w-full bg-zinc-800 border border-white/10 rounded-lg p-3 text-zinc-400 cursor-not-allowed"/>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10 flex justify-end">
                      <button disabled={isSaving} className="bg-white text-black hover:bg-blue-500 hover:text-white px-8 py-3 rounded-lg font-bold text-sm uppercase tracking-widest transition duration-300 disabled:opacity-50">
                        {isSaving ? "Збереження..." : "Зберегти зміни"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 mt-8">
                  <h3 className="font-bold text-lg mb-4">Ваш статус</h3>
                  <div className="flex items-center gap-6">
                     <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br ${currentTier.bg} text-3xl font-black text-white shadow-lg`}>
                        {currentTier.percent}%
                     </div>
                     <div>
                        <div className={`text-2xl font-bold uppercase ${currentTier.color}`}>{currentTier.name}</div>
                        <div className="text-zinc-500">Кешбек на всі неакційні товари</div>
                     </div>
                  </div>
                </div>
             </motion.div>
          )}

          {/* --- ЗАМОВЛЕННЯ --- */}
          {activeTab === "orders" && (
             <div className="space-y-4">
               <h1 className="text-3xl font-bold mb-8">Історія замовлень</h1>
               {orders.length === 0 ? (
                  <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-white/10 border-dashed">
                    <Package size={48} className="mx-auto text-zinc-700 mb-4"/>
                    <p className="text-zinc-500">Ви ще нічого не замовляли. Час це виправити!</p>
                    <button onClick={() => router.push('/catalog')} className="mt-4 text-blue-400 hover:text-blue-300 font-bold text-sm">Перейти в каталог</button>
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden transition duration-300">
                        <div 
                          className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-white/5 transition"
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        >
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-zinc-800 rounded-lg">
                                  <Package size={24} className={order.status === 'completed' ? 'text-green-500' : 'text-blue-500'}/>
                              </div>
                              <div>
                                  <div className="flex items-center gap-3">
                                      <span className="font-mono font-bold text-lg">#{order.id.toString().slice(0,6)}</span>
                                      <StatusBadge status={order.status} />
                                  </div>
                                  <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                                      <Clock size={12}/> {format(new Date(order.created_at), 'd MMMM yyyy, HH:mm', { locale: uk })}
                                  </div>
                              </div>
                          </div>
                          <div className="flex items-center gap-6">
                              <div className="text-right">
                                  <span className="block text-zinc-500 text-xs uppercase">Сума</span>
                                  <span className="text-xl font-bold">{order.total_price} ₴</span>
                              </div>
                              <ChevronDown size={20} className={`text-zinc-500 transition-transform ${expandedOrder === order.id ? "rotate-180" : ""}`}/>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedOrder === order.id && (
                              <motion.div 
                                  initial={{ height: 0, opacity: 0 }} 
                                  animate={{ height: "auto", opacity: 1 }} 
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-white/10 bg-black/30"
                              >
                                  <div className="p-6">
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                          {/* Товари */}
                                          <div>
                                              <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Товари в замовленні</h4>
                                              <div className="space-y-3">
                                                  {order.items.map((item: any, i: number) => (
                                                      <div key={i} className="flex gap-4 bg-zinc-800/50 p-2 rounded-lg">
                                                          <div className="w-12 h-12 bg-black rounded overflow-hidden relative flex-shrink-0">
                                                              <ProductImage src={item.image_url} alt={item.title} fill/>
                                                          </div>
                                                          <div className="flex-1 min-w-0 flex justify-between items-center">
                                                              <div>
                                                                  <div className="text-sm font-medium text-white truncate w-40 sm:w-auto">{item.title}</div>
                                                                  <div className="text-xs text-zinc-500">{item.quantity} шт x {item.price} ₴ {item.selectedSize && `(${item.selectedSize})`}</div>
                                                              </div>
                                                              <div className="font-bold text-sm">{item.price * item.quantity} ₴</div>
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                          
                                          {/* Інфо про доставку */}
                                          <div>
                                              <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Деталі доставки</h4>
                                              <div className="bg-zinc-800/30 p-4 rounded-xl space-y-2 text-sm">
                                                  <div className="flex gap-2"><User size={16} className="text-blue-500"/> {order.delivery_data?.fullName}</div>
                                                  <div className="flex gap-2"><MapPin size={16} className="text-blue-500"/> {order.delivery_data?.city}, {order.delivery_data?.warehouse}</div>
                                                  <div className="flex gap-2"><Truck size={16} className="text-blue-500"/> {order.delivery_data?.phone}</div>
                                                  <div className="flex gap-2"><CreditCard size={16} className="text-blue-500"/> {order.delivery_data?.payment === 'invoice' ? 'Рахунок' : 'Карта'}</div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                  ))
               )}
             </div>
          )}

          {/* --- БОНУСИ --- */}
          {activeTab === "loyalty" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold mb-2">Програма лояльності</h1>
              <p className="text-zinc-500 mb-8">Ваша активність та привілеї.</p>

              {/* Картка Рівня */}
              <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentTier.bg} p-8 md:p-12 text-center md:text-left mb-8 border border-white/10 shadow-2xl`}>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-black/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">Ваш рівень</span>
                        <span className="font-black text-xl uppercase">{currentTier.name}</span>
                    </div>
                    
                    <div className="text-6xl font-black tracking-tighter text-white mb-2">
                      {currentTier.percent}% <span className="text-lg font-medium text-white/70">кешбек</span>
                    </div>
                    
                    <div className="text-sm text-white/80 mb-6">
                        Доступно бонусів: <span className="font-bold text-white text-lg">{profile.bonus_points} грн</span>
                    </div>

                    {nextTier ? (
                        <div>
                            <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden mb-2 backdrop-blur-sm border border-white/10">
                                <div className="bg-white h-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <p className="text-xs text-white/70">
                                Купіть ще на <span className="font-bold text-white">{nextTier.threshold - profile.total_spent} грн</span>, щоб отримати <span className="font-bold text-white">{nextTier.percent}%</span> (Рівень {nextTier.name})
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm font-bold text-white/90">Ви досягли максимального рівня! 🔥</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Історія транзакцій */}
              <h3 className="text-lg font-bold mb-4">Історія бонусів</h3>
              <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                  {loyaltyLogs.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500">Історія порожня</div>
                  ) : (
                      loyaltyLogs.map((log) => (
                          <div key={log.id} className="flex justify-between items-center p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                              <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg ${log.type === 'earn' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                      {log.type === 'earn' ? <Plus size={16}/> : <Minus size={16}/>}
                                  </div>
                                  <div>
                                      <div className="font-bold text-sm">{log.description}</div>
                                      <div className="text-xs text-zinc-500">{format(new Date(log.created_at), 'd MMM yyyy', { locale: uk })}</div>
                                  </div>
                              </div>
                              <div className={`font-mono font-bold ${log.type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                                  {log.type === 'earn' ? '+' : '-'}{log.amount}
                              </div>
                          </div>
                      ))
                  )}
              </div>
            </motion.div>
          )}

          {/* --- АДРЕСИ --- */}
          {activeTab === "addresses" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <h1 className="text-3xl font-bold mb-2">Адреси доставки</h1>
                  <p className="text-zinc-500 mb-8">Керуйте адресами для швидкого оформлення.</p>
                  
                  <div className="bg-zinc-900/50 border border-white/10 border-dashed rounded-xl p-8 text-center">
                      <MapPin size={32} className="mx-auto text-zinc-600 mb-2"/>
                      <p className="text-zinc-500 text-sm mb-4">Поки що ми беремо адресу з останнього замовлення.</p>
                      <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold transition">Додати нову адресу</button>
                  </div>
              </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}

// Sub-components
function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        processing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        shipped: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        completed: "bg-green-500/20 text-green-400 border-green-500/30",
        cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    const labels: any = { 
        new: "Нове", processing: "В роботі", shipped: "Відправлено", completed: "Виконано", cancelled: "Скасовано" 
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.new}`}>
            {labels[status] || status}
        </span>
    );
}