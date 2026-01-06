"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Package, Star, MapPin, LogOut, ArrowLeft,
  Settings, CreditCard, Gift, ShieldCheck, Camera,
  ChevronDown, ChevronUp, Clock, Truck, Plus, Minus, FileText, Printer,
  Crown, Gem, Shield, Sparkles, ScanBarcode, Wifi, RotateCcw, QrCode, FileCheck, Copy, Check
} from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import ProductImage from "@/components/ProductImage"; // Виправлено шлях
import { LOYALTY_TIERS, getCurrentTier, getNextTier } from "@/lib/loyaltyUtils";

// --- КАСТОМІЗАЦІЯ РІВНІВ (FIX: Додано поле shadow) ---
const TIER_STYLES: Record<string, { bg: string, cardGradient: string, border: string, text: string, icon: any, iconColor: string, shadow: string }> = {
  "Start": {
    bg: "from-zinc-800 to-zinc-900",
    cardGradient: "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black",
    border: "border-zinc-600",
    text: "text-zinc-300",
    icon: User,
    iconColor: "text-zinc-400",
    shadow: "shadow-zinc-900/20"
  },
  "Bronze": {
    bg: "from-orange-900/20 to-zinc-900",
    cardGradient: "bg-gradient-to-br from-[#784421] via-[#522e15] to-[#2b170a]",
    border: "border-orange-700/50",
    text: "text-orange-200",
    icon: Shield,
    iconColor: "text-orange-300",
    shadow: "shadow-orange-900/20"
  },
  "Silver": {
    bg: "from-slate-700/20 to-zinc-900",
    cardGradient: "bg-gradient-to-br from-[#94a3b8] via-[#475569] to-[#1e293b]",
    border: "border-slate-400/50",
    text: "text-slate-100",
    icon: ShieldCheck,
    iconColor: "text-white",
    shadow: "shadow-slate-500/20"
  },
  "Gold": {
    bg: "from-yellow-600/20 to-amber-900/20",
    cardGradient: "bg-gradient-to-br from-[#FCD34D] via-[#B45309] to-[#78350F]",
    border: "border-yellow-500/50",
    text: "text-yellow-100",
    icon: Star,
    iconColor: "text-yellow-200",
    shadow: "shadow-yellow-500/20"
  },
  "Platinum": {
    bg: "from-cyan-600/20 to-blue-900/20",
    cardGradient: "bg-gradient-to-br from-[#22d3ee] via-[#0891b2] to-[#164e63]",
    border: "border-cyan-400/50",
    text: "text-cyan-50",
    icon: Gem,
    iconColor: "text-cyan-100",
    shadow: "shadow-cyan-500/20"
  },
  "Elite": {
    bg: "from-fuchsia-600/20 to-purple-900/20",
    cardGradient: "bg-gradient-to-br from-[#e879f9] via-[#a21caf] to-[#4a044e]",
    border: "border-fuchsia-500/50",
    text: "text-fuchsia-100",
    icon: Crown,
    iconColor: "text-fuchsia-200",
    shadow: "shadow-fuchsia-500/20"
  }
};

// Компонент штрих-коду
const Barcode = ({ className }: { className?: string }) => (
  <div className={`flex items-center justify-center gap-[3px] h-16 w-full bg-white px-4 py-2 rounded-md overflow-hidden ${className}`}>
    {Array.from({ length: 50 }).map((_, i) => (
      <div
        key={i}
        className="h-full bg-black"
        style={{ width: Math.random() > 0.5 ? '2px' : '5px' }}
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
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [copiedTtn, setCopiedTtn] = useState<string | null>(null);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTtn(text);
    setTimeout(() => setCopiedTtn(null), 2000);
  };

  // Функція генерації документів
  const printDocument = (order: any, type: 'invoice' | 'waybill') => {
    const buyerName = profile.company_name || profile.full_name || "Покупець";
    const buyerEdrpou = profile.edrpou ? `(${profile.edrpou})` : "";

    const dateSource = type === 'waybill' ? (order.updated_at || order.created_at) : order.created_at;
    const dateStr = new Date(dateSource).toLocaleDateString('uk-UA');

    const docTitle = type === 'invoice' ? `Рахунок-фактура №${order.id}` : `Видаткова накладна №${order.id}`;
    const docHeader = type === 'invoice' ? `Рахунок-фактура № ${order.id}` : `Видаткова накладна № ${order.id}`;

    const htmlContent = `
        <html>
        <head>
            <title>${docTitle}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
                .header { margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                .seller-info, .buyer-info { margin-bottom: 20px; }
                h1 { font-size: 24px; margin-bottom: 5px; text-transform: uppercase; }
                .date { color: #666; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; margin-top: 20px; }
                th { background: #f8f9fa; text-align: left; padding: 10px; border: 1px solid #ddd; font-size: 12px; text-transform: uppercase; }
                td { padding: 10px; border: 1px solid #ddd; font-size: 14px; }
                .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
                .footer { margin-top: 50px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
                .label { font-weight: bold; color: #555; margin-right: 5px; }
                .row { display: flex; justify-content: space-between; }
                .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${docHeader}</h1>
                <div class="date">від ${dateStr}</div>
            </div>

            <div class="seller-info">
                <div class="section-title">Постачальник</div>
                <div><span class="label">Назва:</span> ФОП ШЕВЧУК ЯРОСЛАВ ВОЛОДИМИРОВИЧ</div>
                <div><span class="label">Код (ЄДРПОУ):</span> 3605107010</div>
                <div><span class="label">IBAN:</span> UA473052990000026006025512967</div>
                <div><span class="label">Банк:</span> АТ КБ "ПРИВАТБАНК"</div>
            </div>

            <div class="buyer-info">
                <div class="section-title">Одержувач</div>
                <div><span class="label">Покупець:</span> ${buyerName} ${buyerEdrpou}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px; text-align: center;">№</th>
                        <th>Товар</th>
                        <th style="width: 60px; text-align: center;">Од.</th>
                        <th style="width: 80px; text-align: center;">К-сть</th>
                        <th style="width: 100px; text-align: right;">Ціна</th>
                        <th style="width: 100px; text-align: right;">Сума</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map((item: any, i: number) => `
                        <tr>
                            <td style="text-align: center;">${i + 1}</td>
                            <td>
                                ${item.title}
                                ${item.selectedSize ? `<div style="font-size: 11px; color: #666;">Розмір: ${item.selectedSize}</div>` : ''}
                            </td>
                            <td style="text-align: center;">шт.</td>
                            <td style="text-align: center;">${item.quantity}</td>
                            <td style="text-align: right;">${item.price.toFixed(2)}</td>
                            <td style="text-align: right;">${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total">
                Всього до сплати: ${order.final_price ? order.final_price.toFixed(2) : order.total_price.toFixed(2)} грн
            </div>
            
            ${order.discount_bonuses > 0 ? `<div style="text-align: right; font-size: 14px; color: #666; margin-top: 5px;">(В т.ч. оплачено бонусами: ${order.discount_bonuses} грн)</div>` : ''}

            ${type === 'invoice'
        ? `<div class="footer">Рахунок дійсний до сплати протягом 3-х банківських днів.</div>`
        : `<div class="footer" style="display: flex; justify-content: space-between; margin-top: 50px;">
                      <div>Відвантажив: ___________________</div>
                      <div>Отримав: ___________________</div>
                    </div>`
      }
        </body>
        </html>
      `;

    const win = window.open('', '_blank');
    if (win) { win.document.write(htmlContent); win.document.close(); win.print(); }
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

  const formattedCardNumber = profile.phone
    ? profile.phone.replace(/\D/g, '').padEnd(16, '0').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
    : "0000 0000 0000 0000";

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Завантаження...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex transition-colors duration-300">
      {/* SIDEBAR */}
      <aside className="w-20 lg:w-72 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950/50 backdrop-blur fixed h-full flex flex-col z-20 transition-colors">
        <div className="p-6 h-24 flex items-center border-b border-gray-200 dark:border-white/10">
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

            < button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition duration-300 text-sm font-bold uppercase tracking-wide
                ${activeTab === item.id
                  ? `bg-gradient-to-r ${tierStyle.bg} text-white shadow-lg ${tierStyle.shadow}`
                  : "text-gray-500 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"}`}
            >
              <item.icon size={18} />
              <span className="hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-white/10 space-y-2">
          <button onClick={() => router.push("/")} className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-500 dark:text-zinc-500 hover:text-black dark:hover:text-white transition text-sm font-bold"><ArrowLeft size={18} /> <span className="hidden lg:block">В магазин</span></button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition text-sm font-bold"><LogOut size={18} /> <span className="hidden lg:block">Вийти</span></button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 ml-20 lg:ml-72 p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto">

          {/* --- ПРОФІЛЬ --- */}
          {activeTab === "profile" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Особисті дані</h1>
              <p className="text-gray-500 dark:text-zinc-500 mb-8">Ця інформація буде автоматично підставлятися при оформленні замовлень.</p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Картка статусу (З ОНОВЛЕНИМ ДИЗАЙНОМ) */}
                <div className="lg:col-span-1">
                  {/* Міні-картка */}
                  <div className={`aspect-[1.58] rounded-2xl p-6 relative overflow-hidden shadow-xl ${tierStyle.cardGradient} border border-white/10 flex flex-col justify-between`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="relative z-10 flex justify-between items-start">
                      <span className="font-black italic text-white/90 tracking-tighter">REBRAND</span>
                      <TierIcon className="text-white/80" size={24} />
                    </div>
                    <div className="relative z-10">
                      <div className="text-xs text-white/60 mb-1 font-mono">{formattedCardNumber}</div>
                      <div className="flex justify-between items-end">
                        <div className="text-sm font-bold text-white uppercase tracking-widest truncate w-24">{profile.full_name || "MEMBER"}</div>
                        <div className="text-xs font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">{currentTier.name}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <form onSubmit={updateProfile} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-6 transition-colors shadow-sm dark:shadow-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase">ПІБ</label>
                        <input type="text" value={profile.full_name || ""} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors" placeholder="Іван Іванов" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase">Компанія (ТОВ/ФОП)</label>
                        <input type="text" value={profile.company_name || ""} onChange={e => setProfile({ ...profile, company_name: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors" placeholder="Brandzilla LLC" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase">ЄДРПОУ</label>
                        <input type="text" value={profile.edrpou || ""} onChange={e => setProfile({ ...profile, edrpou: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors" placeholder="12345678" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase">Телефон</label>
                        <input type="text" value={profile.phone || ""} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors" placeholder="+380..." />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex justify-end">
                      <button disabled={isSaving} className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-blue-500 dark:hover:text-white px-8 py-3 rounded-lg font-bold text-sm uppercase tracking-widest transition duration-300 disabled:opacity-50">
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
              <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Історія замовлень</h1>
              {orders.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-900/50 rounded-2xl border border-gray-200 dark:border-white/10 border-dashed">
                  <Package size={48} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
                  <p className="text-gray-500 dark:text-zinc-500">Історія замовлень порожня.</p>
                  <button onClick={() => router.push('/catalog')} className="mt-4 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold text-sm">Перейти в каталог</button>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden transition duration-300 shadow-sm dark:shadow-none">
                    <div
                      className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                          <Package size={24} className={order.status === 'completed' ? 'text-green-600 dark:text-green-500' : 'text-blue-600 dark:text-blue-500'} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-lg text-gray-900 dark:text-white">#{order.id.toString().slice(0, 6)}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-zinc-500 flex items-center gap-2 mt-1">
                            <Clock size={12} /> {format(new Date(order.created_at), 'd MMMM yyyy, HH:mm', { locale: uk })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="block text-gray-500 dark:text-zinc-500 text-xs uppercase">Сума</span>
                          <span className="text-xl font-bold text-gray-900 dark:text-white">{order.final_price || order.total_price} ₴</span>
                        </div>
                        <ChevronDown size={20} className={`text-gray-400 dark:text-zinc-500 transition-transform ${expandedOrder === order.id ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedOrder === order.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30"
                        >
                          <div className="p-6">
                            <div className="flex justify-end gap-3 mb-6">
                              {/* КНОПКА РАХУНКУ */}
                              <button
                                onClick={() => printDocument(order, 'invoice')}
                                className="flex items-center gap-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700 px-4 py-2 rounded-lg font-bold text-xs transition border border-gray-200 dark:border-white/10 shadow-sm"
                              >
                                <Printer size={16} /> Рахунок
                              </button>

                              {/* КНОПКА НАКЛАДНОЇ */}
                              {(order.status === 'completed' || order.status === 'shipped') && (
                                <button
                                  onClick={() => printDocument(order, 'waybill')}
                                  className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500 px-4 py-2 rounded-lg font-bold text-xs transition shadow-lg shadow-blue-500/20"
                                >
                                  <FileText size={16} /> Видаткова накладна
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-3">Товари в замовленні</h4>
                                <div className="space-y-3">
                                  {Array.isArray(order.items) && order.items.map((item: any, i: number) => {
                                    if (!item) return null;
                                    return (
                                      <div key={i} className="flex gap-4 bg-white dark:bg-zinc-800/50 p-2 rounded-lg border border-gray-100 dark:border-transparent transition-colors">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-black rounded overflow-hidden relative flex-shrink-0">
                                          <ProductImage
                                            src={item.image_url || item.image || ''}
                                            alt={item.title || 'Товар'}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0 flex justify-between items-center">
                                          <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate w-32 sm:w-auto">{item.title || "Без назви"}</div>
                                            <div className="text-xs text-gray-500 dark:text-zinc-500">{item.quantity} шт x {item.price} ₴ {item.selectedSize && `(${item.selectedSize})`}</div>
                                          </div>
                                          <div className="font-bold text-sm text-gray-900 dark:text-white">{item.price * item.quantity} ₴</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-3">Деталі доставки</h4>
                                <div className="bg-white dark:bg-zinc-800/30 p-4 rounded-xl space-y-2 text-sm border border-gray-100 dark:border-transparent">
                                  <div className="flex gap-2 text-gray-700 dark:text-gray-300"><User size={16} className="text-blue-500" /> {order.delivery_data?.fullName}</div>
                                  <div className="flex gap-2 text-gray-700 dark:text-gray-300"><MapPin size={16} className="text-blue-500" /> {order.delivery_data?.city}, {order.delivery_data?.warehouse}</div>
                                  <div className="flex gap-2 text-gray-700 dark:text-gray-300"><Truck size={16} className="text-blue-500" /> {order.delivery_data?.phone}</div>
                                  {/* ТТН ОНОВЛЕНО */}
                                  {order.delivery_data?.ttn && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                                      <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1">Номер накладної (ТТН):</div>
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono text-lg text-gray-900 dark:text-white font-bold bg-gray-100 dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-white/10">
                                          {order.delivery_data.ttn}
                                        </span>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(order.delivery_data.ttn);
                                            setCopiedTtn(order.delivery_data.ttn);
                                            setTimeout(() => setCopiedTtn(null), 2000);
                                          }}
                                          className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-white transition flex items-center gap-1"
                                        >
                                          {copiedTtn === order.delivery_data.ttn ? <Check size={12} /> : <Copy size={12} />}
                                          {copiedTtn === order.delivery_data.ttn ? "Скопійовано" : "Копіювати"}
                                        </button>
                                      </div>
                                    </div>
                                  )}
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

          {/* --- БОНУСИ (КАРТКА FLIP) --- */}
          {activeTab === "loyalty" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold mb-2">Програма лояльності</h1>
              <p className="text-zinc-500 mb-8">Натисніть на картку, щоб побачити штрих-код.</p>
              <div className="flex justify-center mb-12 perspective-1000">
                <motion.div
                  className="w-full max-w-md aspect-[1.58] relative cursor-pointer"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                >
                  {/* ...FRONT CARD... */}
                  <div className={`absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/20 ${tierStyle.cardGradient} p-8 flex flex-col justify-between backface-hidden`} style={{ backfaceVisibility: "hidden" }}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="relative z-10 flex justify-between items-start">
                      <div className="flex flex-col gap-4">
                        <span className="text-2xl font-black italic text-white tracking-tighter drop-shadow-md">REBRAND</span>
                        <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-md border border-yellow-700/50 relative overflow-hidden shadow-inner">
                          <div className="absolute inset-0 border border-black/10 rounded-md"></div>
                          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20"></div>
                          <div className="absolute left-1/2 top-0 h-full w-[1px] bg-black/20"></div>
                          <Wifi size={16} className="absolute right-1 top-1 text-black/20 -rotate-90" />
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 font-bold uppercase tracking-widest ${tierStyle.text} bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10`}>
                        <TierIcon size={16} />
                        {currentTier.name}
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="font-mono text-xl text-white/90 tracking-widest drop-shadow-md mb-1">{formattedCardNumber}</div>
                      <div className="flex justify-between items-end mt-6">
                        <div>
                          <div className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Власник</div>
                          <div className="text-sm font-bold text-white uppercase tracking-wide">{profile.full_name || "MEMBER"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Баланс</div>
                          <div className="text-2xl font-black text-white leading-none">{profile.bonus_points} ₴</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* ...BACK CARD... */}
                  <div className={`absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-zinc-900 p-0 flex flex-col justify-between backface-hidden`} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <div className="mt-6 h-12 w-full bg-black"></div>
                    <div className="px-8 flex-1 flex flex-col justify-center items-center gap-4">
                      <div className="w-full bg-white px-4 py-2 flex items-center gap-4">
                        <div className="flex-1 h-8 bg-gray-200 font-handwriting flex items-center px-2 text-black italic font-bold">Authorized Signature</div>
                        <div className="text-black font-bold font-mono text-lg">{session?.user?.id?.slice(0, 3).toUpperCase()}</div>
                      </div>
                      <div className="w-full bg-white p-4 rounded-xl flex flex-col items-center justify-center">
                        <Barcode className="w-full h-16" />
                        <div className="text-black font-mono text-xs tracking-[0.3em] mt-2">{session?.user?.id?.slice(0, 12).toUpperCase() || "000000000000"}</div>
                      </div>
                      <p className="text-zinc-500 text-[10px] text-center max-w-xs">Ця картка є власністю REBRAND STUDIO. Використовуйте для нарахування та списання бонусів.</p>
                    </div>
                  </div>
                </motion.div>
              </div>
              {/* Прогрес */}
              {/* Прогрес */}
              {nextTier ? (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-8 mb-8 shadow-sm dark:shadow-none">
                  <div className="flex justify-between items-end mb-4">
                    <div><h3 className="font-bold text-gray-900 dark:text-white">Ваш прогрес</h3><p className="text-sm text-gray-500 dark:text-zinc-500">До рівня <span className={`${nextTier.color} font-bold`}>{nextTier.name}</span> залишилось:</p></div>
                    <div className="text-right"><span className="text-2xl font-bold text-gray-900 dark:text-white">{nextTier.threshold - profile.total_spent} грн</span></div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-black h-4 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 relative">
                    <div className={`h-full transition-all duration-1000 ${currentTier.name === 'Start' ? 'bg-zinc-500' : tierStyle.text.replace('text-', 'bg-')}`} style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mt-3 text-center">Поточний кешбек: <span className="text-gray-900 dark:text-white font-bold">{currentTier.percent}%</span> &rarr; Наступний: <span className="text-gray-900 dark:text-white font-bold">{nextTier.percent}%</span></p>
                </div>
              ) : (<div className="bg-gradient-to-r from-purple-900/50 to-fuchsia-900/50 border border-purple-500/30 rounded-2xl p-8 mb-8 text-center"><Crown size={48} className="mx-auto text-fuchsia-400 mb-4" /><h3 className="text-2xl font-bold text-white mb-2">Ви досягли вершини!</h3><p className="text-fuchsia-200">Максимальний рівень лояльності. Ви — наш найцінніший клієнт.</p></div>)}

              {/* Історія бонусів */}
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Історія бонусів</h3>
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                {loyaltyLogs.length === 0 ? <div className="p-8 text-center text-gray-500 dark:text-zinc-500">Історія порожня</div> : loyaltyLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${log.type === 'earn' ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-500' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-500'}`}>{log.type === 'earn' ? <Plus size={16} /> : <Minus size={16} />}</div>
                      <div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white">{log.description}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-500">{format(new Date(log.created_at), 'd MMM yyyy', { locale: uk })}</div>
                      </div>
                    </div>
                    <div className={`font-mono font-bold ${log.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{log.type === 'earn' ? '+' : '-'}{log.amount}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* --- АДРЕСИ --- */}
          {activeTab === "addresses" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Адреси доставки</h1>
              <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 border-dashed rounded-xl p-8 text-center">
                <MapPin size={32} className="mx-auto text-gray-300 dark:text-zinc-600 mb-2" />
                <p className="text-gray-500 dark:text-zinc-500 text-sm mb-4">Адреси зберігаються автоматично після замовлень.</p>
              </div>
            </motion.div>
          )}

        </div>
      </main>
    </div >
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    new: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
    processing: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30",
    shipped: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30",
    completed: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30",
    cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
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