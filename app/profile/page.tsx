"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Package, Star, MapPin, LogOut, ArrowLeft, 
  Settings, CreditCard, Gift, ShieldCheck, Camera, 
  ChevronDown, ChevronUp, Clock, Truck, Plus, Minus, FileText, Printer,
  Crown, Gem, Shield, Sparkles, ScanBarcode, Wifi
} from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import ProductImage from "../components/ProductImage";
import { LOYALTY_TIERS, getCurrentTier, getNextTier } from "@/lib/loyaltyUtils";

// --- КАСТОМІЗАЦІЯ РІВНІВ (ОНОВЛЕНО ДЛЯ КАРТКИ) ---
const TIER_STYLES: Record<string, { bg: string, cardGradient: string, border: string, text: string, icon: any, iconColor: string }> = {
  "Start": { 
    bg: "from-zinc-800 to-zinc-900",
    cardGradient: "bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900",
    border: "border-zinc-600",
    text: "text-zinc-300",
    icon: User,
    iconColor: "text-zinc-400"
  },
  "Bronze": { 
    bg: "from-orange-900/20 to-zinc-900",
    cardGradient: "bg-gradient-to-br from-[#784421] via-[#522e15] to-[#2b170a]", 
    border: "border-orange-700/50", 
    text: "text-orange-200",
    icon: Shield,
    iconColor: "text-orange-300"
  },
  "Silver": { 
    bg: "from-slate-700/20 to-zinc-900", 
    cardGradient: "bg-gradient-to-br from-[#94a3b8] via-[#475569] to-[#1e293b]",
    border: "border-slate-400/50", 
    text: "text-slate-100",
    icon: ShieldCheck,
    iconColor: "text-white"
  },
  "Gold": { 
    bg: "from-yellow-600/20 to-amber-900/20", 
    cardGradient: "bg-gradient-to-br from-[#fbbf24] via-[#b45309] to-[#78350f]",
    border: "border-yellow-500/50", 
    text: "text-yellow-100",
    icon: Star,
    iconColor: "text-yellow-200"
  },
  "Platinum": { 
    bg: "from-cyan-600/20 to-blue-900/20", 
    cardGradient: "bg-gradient-to-br from-[#22d3ee] via-[#0891b2] to-[#164e63]",
    border: "border-cyan-400/50", 
    text: "text-cyan-50",
    icon: Gem,
    iconColor: "text-cyan-100"
  },
  "Elite": { 
    bg: "from-fuchsia-600/20 to-purple-900/20", 
    cardGradient: "bg-gradient-to-br from-[#e879f9] via-[#a21caf] to-[#4a044e]",
    border: "border-fuchsia-500/50", 
    text: "text-fuchsia-100",
    icon: Crown,
    iconColor: "text-fuchsia-200"
  }
};

// Компонент штрих-коду (імітація)
const Barcode = () => (
    <div className="flex items-center justify-center gap-[2px] h-10 w-full bg-white/90 px-2 py-1 rounded-sm overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
            <div 
                key={i} 
                className="h-full bg-black" 
                style={{ width: Math.random() > 0.5 ? '2px' : '4px', opacity: 0.9 }}
            ></div>
        ))}
    </div>
);

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
    edrpou: "", 
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
        edrpou: profileData?.edrpou || "", 
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
      edrpou: profile.edrpou, 
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

  const printInvoice = (order: any) => {
      const buyerName = profile.company_name || profile.full_name || "Покупець";
      const buyerEdrpou = profile.edrpou ? `(${profile.edrpou})` : "";
      const dateStr = new Date(order.created_at).toLocaleDateString('uk-UA');
      
      // ... (код друку рахунку залишаємо без змін) ...
      const invoiceHTML = `
        <html>
        <head>
            <title>Рахунок-фактура №${order.id}</title>
        </head>
        <body>
            <h1>Рахунок № ${order.id}</h1>
            <p>Друк рахунку...</p>
            <script>window.print();</script>
        </body>
        </html>
      `;
      const win = window.open('', '_blank');
      if(win) { win.document.write(invoiceHTML); win.document.close(); }
  };

  const currentTier = getCurrentTier(profile.total_spent);
  const nextTier = getNextTier(profile.total_spent);
  const tierStyle = TIER_STYLES[currentTier.name] || TIER_STYLES["Start"];
  const TierIcon = tierStyle.icon;
  
  let progressPercent = 100;
  if (nextTier) {
      const prevThreshold = currentTier.threshold;
      const nextThreshold = nextTier.threshold;
      const currentProgress = profile.total_spent - prevThreshold;
      const totalNeeded = nextThreshold - prevThreshold;
      progressPercent = Math.min(100, Math.max(0, (currentProgress / totalNeeded) * 100));
  }

  // Форматування номера картки (фейковий)
  const formattedCardNumber = profile.phone 
    ? profile.phone.replace(/\D/g, '').padEnd(16, '0').replace(/(\d{4})(?=\d)/g, '$1 ')
    : "0000 0000 0000 0000";

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Завантаження...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex">
      {/* SIDEBAR */}
      <aside className="w-20 lg:w-72 border-r border-white/10 bg-zinc-950/50 backdrop-blur fixed h-full flex flex-col z-20">
        <div className="p-6 h-24 flex items-center border-b border-white/10">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg bg-gradient-to-br ${tierStyle.bg} border ${tierStyle.border}`}>
             {profile.full_name ? profile.full_name[0] : "U"}
           </div>
           <div className="ml-4 hidden lg:block">
             <div className="font-bold text-sm truncate w-40">{profile.full_name || "Гість"}</div>
             <div className={`text-xs truncate w-40 font-bold ${tierStyle.text}`}>{currentTier.name} Member</div>
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
                ${activeTab === item.id 
                  ? `bg-gradient-to-r ${tierStyle.bg} text-white shadow-lg ${tierStyle.shadow}` 
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"}`}
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
                <div className="lg:col-span-1">
                   {/* Маленька картка рівня (міні) */}
                   <div className={`aspect-[1.58] rounded-2xl p-6 relative overflow-hidden shadow-xl ${tierStyle.cardGradient} border border-white/10 flex flex-col justify-between`}>
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                      <div className="relative z-10 flex justify-between items-start">
                         <span className="font-black italic text-white/90 tracking-tighter">REBRAND</span>
                         <TierIcon className="text-white/80" size={24}/>
                      </div>
                      <div className="relative z-10">
                         <div className="text-xs text-white/60 mb-1 font-mono">{formattedCardNumber}</div>
                         <div className="flex justify-between items-end">
                            <div className="text-sm font-bold text-white uppercase tracking-widest">{profile.full_name || "MEMBER"}</div>
                            <div className="text-xs font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded">{currentTier.name}</div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="lg:col-span-2">
                  <form onSubmit={updateProfile} className="bg-zinc-900 border border-white/10 rounded-2xl p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">ПІБ</label>
                        <input type="text" value={profile.full_name || ""} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="Іван Іванов"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Компанія (ТОВ/ФОП)</label>
                        <input type="text" value={profile.company_name || ""} onChange={e => setProfile({...profile, company_name: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="Brandzilla LLC"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">ЄДРПОУ</label>
                        <input type="text" value={profile.edrpou || ""} onChange={e => setProfile({...profile, edrpou: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="12345678"/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Телефон</label>
                        <input type="text" value={profile.phone || ""} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" placeholder="+380..."/>
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
             </motion.div>
          )}

          {/* --- ЗАМОВЛЕННЯ --- */}
          {activeTab === "orders" && (
             <div className="space-y-4">
               {/* ... (код замовлень залишається без змін) ... */}
               <h1 className="text-3xl font-bold mb-8">Історія замовлень</h1>
               <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-white/10 border-dashed">
                  <Package size={48} className="mx-auto text-zinc-700 mb-4"/>
                  <p className="text-zinc-500">Тут буде історія ваших замовлень.</p>
               </div>
             </div>
          )}

          {/* --- БОНУСИ (КАРТКА) --- */}
          {activeTab === "loyalty" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold mb-2">Програма лояльності</h1>
              <p className="text-zinc-500 mb-8">Ваша персональна картка учасника клубу.</p>

              {/* === ВЕЛИКА КАРТКА КЛІЄНТА === */}
              <div className="flex justify-center mb-12">
                  <div className={`w-full max-w-md aspect-[1.58] rounded-3xl relative overflow-hidden shadow-2xl shadow-black/50 transition-transform hover:scale-[1.02] duration-500 ${tierStyle.cardGradient} border border-white/20`}>
                      
                      {/* Текстура "Шум" для реалізму */}
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
                      
                      {/* Відблиск */}
                      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>

                      {/* Контент картки */}
                      <div className="relative z-10 h-full flex flex-col justify-between p-8">
                          
                          {/* Верх: Лого і Чіп */}
                          <div className="flex justify-between items-start">
                              <div className="flex flex-col gap-4">
                                  <span className="text-2xl font-black italic text-white tracking-tighter drop-shadow-md">REBRAND</span>
                                  {/* Чіп */}
                                  <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-md border border-yellow-700/50 relative overflow-hidden shadow-inner">
                                      <div className="absolute inset-0 border border-black/10 rounded-md"></div>
                                      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20"></div>
                                      <div className="absolute left-1/2 top-0 h-full w-[1px] bg-black/20"></div>
                                      <Wifi size={16} className="absolute right-1 top-1 text-black/20 -rotate-90"/>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className={`flex items-center gap-2 font-bold uppercase tracking-widest ${tierStyle.text} bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10`}>
                                      <TierIcon size={16} />
                                      {currentTier.name}
                                  </div>
                              </div>
                          </div>

                          {/* Центр: Номер картки */}
                          <div className="font-mono text-xl md:text-2xl text-white tracking-widest drop-shadow-md opacity-90 mt-4" style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.5)" }}>
                              {formattedCardNumber}
                          </div>

                          {/* Низ: Ім'я та Баланс + Штрих-код */}
                          <div className="flex justify-between items-end">
                              <div>
                                  <div className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Власник</div>
                                  <div className="text-sm font-bold text-white uppercase tracking-wide">{profile.full_name || "VALUED MEMBER"}</div>
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                  <div className="text-right">
                                      <div className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Баланс</div>
                                      <div className="text-2xl font-black text-white leading-none">{profile.bonus_points} ₴</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      {/* Штрих-код знизу */}
                      <div className="absolute bottom-0 left-0 w-full h-12 bg-white flex items-center justify-center px-8">
                           <Barcode />
                           <div className="absolute bottom-1 right-4 text-[8px] text-black font-mono tracking-[0.2em]">
                               {userId?.slice(0, 8).toUpperCase() || "00000000"}
                           </div>
                      </div>
                  </div>
              </div>

              {/* Прогрес до наступного рівня */}
              {nextTier ? (
                  <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 mb-8">
                      <div className="flex justify-between items-end mb-4">
                          <div>
                              <h3 className="font-bold text-white">Ваш прогрес</h3>
                              <p className="text-sm text-zinc-500">До рівня <span className={`${nextTier.color} font-bold`}>{nextTier.name}</span> залишилось:</p>
                          </div>
                          <div className="text-right">
                              <span className="text-2xl font-bold text-white">{nextTier.threshold - profile.total_spent} грн</span>
                          </div>
                      </div>
                      <div className="w-full bg-black h-4 rounded-full overflow-hidden border border-white/10 relative">
                          <div className={`h-full transition-all duration-1000 ${currentTier.name === 'Start' ? 'bg-zinc-500' : tierStyle.text.replace('text-', 'bg-')}`} style={{ width: `${progressPercent}%` }}></div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-3 text-center">
                          Поточний кешбек: <span className="text-white font-bold">{currentTier.percent}%</span> &rarr; Наступний: <span className="text-white font-bold">{nextTier.percent}%</span>
                      </p>
                  </div>
              ) : (
                  <div className="bg-gradient-to-r from-purple-900/50 to-fuchsia-900/50 border border-purple-500/30 rounded-2xl p-8 mb-8 text-center">
                      <Crown size={48} className="mx-auto text-fuchsia-400 mb-4"/>
                      <h3 className="text-2xl font-bold text-white mb-2">Ви досягли вершини!</h3>
                      <p className="text-fuchsia-200">Максимальний рівень лояльності. Ви — наш найцінніший клієнт.</p>
                  </div>
              )}

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
                  <div className="bg-zinc-900/50 border border-white/10 border-dashed rounded-xl p-8 text-center">
                      <MapPin size={32} className="mx-auto text-zinc-600 mb-2"/>
                      <p className="text-zinc-500 text-sm mb-4">Адреси зберігаються автоматично після замовлень.</p>
                  </div>
              </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}