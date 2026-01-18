"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import {
    User, Mail, Phone, Calendar, MapPin, ShieldAlert, ArrowLeft,
    ShoppingBag, Eye, Clock, CreditCard, CheckCircle, XCircle,
    LayoutDashboard, List, Activity, ChevronLeft, ChevronRight,
    Building2
} from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

const ITEMS_PER_PAGE = 20;

export default function AdminCustomerDetails() {
    const { id } = useParams();
    const router = useRouter();

    // Data States
    const [user, setUser] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);

    // Activity Log State
    const [events, setEvents] = useState<any[]>([]);
    const [totalEvents, setTotalEvents] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    // UI States
    const [loading, setLoading] = useState(true);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'activity'>('overview');

    useEffect(() => {
        if (id) fetchInitialData();
    }, [id]);

    useEffect(() => {
        if (id && activeTab === 'activity') {
            fetchEvents(currentPage);
        }
    }, [id, currentPage, activeTab]);

    async function fetchInitialData() {
        setLoading(true);
        // 1. Profile
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single();

        // 2. Orders - Link by BOTH user_id and user_email for better visibility
        let query = supabase.from("orders").select("*");

        if (profile?.email) {
            query = query.or(`user_id.eq.${id},user_email.eq.${profile.email.trim().toLowerCase()}`);
        } else {
            query = query.eq("user_id", id);
        }

        const { data: userOrders } = await query.order("created_at", { ascending: false });

        setUser(profile);
        setOrders(userOrders || []);

        setLoading(false);
    }

    async function fetchEvents(page: number) {
        setLoadingEvents(true);
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data, count } = await supabase
            .from("customer_events")
            .select("*", { count: 'exact' })
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .range(from, to);

        setEvents(data || []);
        setTotalEvents(count || 0);
        setLoadingEvents(false);
    }

    if (loading) return <div className="p-10 text-center flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
    if (!user) return <div className="p-10 text-center">Користувача не знайдено</div>;

    const totalSpent = orders.reduce((sum, o) => sum + o.total_price, 0);
    const totalPages = Math.ceil(totalEvents / ITEMS_PER_PAGE);

    // --- HELPER to Format Event Title ---
    const getEventTitle = (e: any) => {
        if (e.event_type === 'ORDER') return `Замовлення #${e.details?.order_id || 'Нове'}`;
        if (e.event_type === 'ADD_TO_CART') return e.details?.title ? `Додав у кошик: "${e.details.title}"` : 'Додав товар у кошик';
        if (e.event_type === 'PRODUCT_VIEW') return e.details?.title ? `Перегляд: "${e.details.title}"` : 'Переглянув товар';

        // For Page Views, try to make path readable
        if (e.event_type === 'PAGE_VIEW') {
            if (e.path === '/') return 'Головна сторінка';
            if (e.path.startsWith('/catalog')) return 'Каталог товарів';
            if (e.path.startsWith('/cart')) return 'Кошик';
            if (e.path.startsWith('/checkout')) return 'Оформлення замовлення';
            return e.details?.title || e.path;
        }
        return e.event_type;
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* HEADER */}
            <div className="mb-6">
                <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-black dark:hover:text-white transition">
                    <ArrowLeft size={16} /> Назад до списку
                </button>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <User size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">{user.full_name || "Гість"}</h1>
                            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                                <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-xs font-mono">ID: {user.id.split('-')[0]}...</span>
                                {user.company_name && <span className="flex items-center gap-1"><Building2 size={12} /> {user.company_name}</span>}
                                {user.is_verified && <span className="text-green-500 flex items-center gap-1"><CheckCircle size={12} /> Verified</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 px-4 py-2 rounded-xl text-right">
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">LTV</div>
                            <div className="text-lg font-black text-green-500">{totalSpent.toLocaleString()} ₴</div>
                        </div>
                        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 px-4 py-2 rounded-xl text-right">
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Замовлень</div>
                            <div className="text-lg font-black">{orders.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex items-center gap-1 bg-white dark:bg-[#111] p-1 rounded-xl border border-gray-200 dark:border-white/10 mb-8 w-fit">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'overview' ? 'bg-gray-100 dark:bg-white/10 text-black dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                    <LayoutDashboard size={16} /> Огляд
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'orders' ? 'bg-gray-100 dark:bg-white/10 text-black dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                    <List size={16} /> Замовлення ({orders.length})
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'activity' ? 'bg-gray-100 dark:bg-white/10 text-black dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                >
                    <Activity size={16} /> Активність
                </button>
            </div>

            {/* CONTENT - OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-4">Контактна Інформація</h3>
                        <div className="space-y-4">
                            <div className="flex items-center bg-gray-50 dark:bg-white/5 p-3 rounded-xl gap-4">
                                <div className="w-10 h-10 bg-white dark:bg-black rounded-lg flex items-center justify-center text-gray-400 shadow-sm"><Mail size={20} /></div>
                                <div><div className="text-xs text-gray-500">Email</div><div className="font-medium">{user.email}</div></div>
                            </div>
                            <div className="flex items-center bg-gray-50 dark:bg-white/5 p-3 rounded-xl gap-4">
                                <div className="w-10 h-10 bg-white dark:bg-black rounded-lg flex items-center justify-center text-gray-400 shadow-sm"><Phone size={20} /></div>
                                <div><div className="text-xs text-gray-500">Телефон</div><div className="font-medium">{user.phone || "—"}</div></div>
                            </div>
                            <div className="flex items-center bg-gray-50 dark:bg-white/5 p-3 rounded-xl gap-4">
                                <div className="w-10 h-10 bg-white dark:bg-black rounded-lg flex items-center justify-center text-gray-400 shadow-sm"><MapPin size={20} /></div>
                                <div><div className="text-xs text-gray-500">Місто</div><div className="font-medium">{user.city || "—"}</div></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-4">Юридична Інформація</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                <span className="text-gray-500">Компанія</span>
                                <span className="font-medium">{user.company_name || "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                <span className="text-gray-500">ЄДРПОУ</span>
                                <span className="font-mono">{user.edrpou || "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                <span className="text-gray-500">Статус</span>
                                <div>
                                    {user.is_verified
                                        ? <span className="text-green-500 text-sm font-bold bg-green-900/10 px-2 py-1 rounded">Активний</span>
                                        : <span className="text-yellow-500 text-sm font-bold bg-yellow-900/10 px-2 py-1 rounded">Очікує</span>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENT - ORDERS */}
            {activeTab === 'orders' && (
                <div className="space-y-4">
                    {orders.length === 0 ? <p className="text-gray-500 text-center py-10">Замовлень поки немає.</p> : orders.map(order => (
                        <div key={order.id} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-blue-500/50 transition cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-lg flex items-center justify-center font-bold">#</div>
                                <div>
                                    <div className="font-bold">Замовлення #{order.id}</div>
                                    <div className="text-xs text-gray-500">{format(new Date(order.created_at), 'd MMMM yyyy HH:mm', { locale: uk })}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold">{order.total_price} ₴</div>
                                <div className={`text-xs font-bold px-2 py-0.5 rounded inline-block ${order.status === 'completed' ? 'bg-green-100 text-green-600' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {order.status}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CONTENT - ACTIVITY LOG */}
            {activeTab === 'activity' && (
                <div>
                    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                        {loadingEvents ? <div className="p-10 text-center text-gray-500">Завантаження подій...</div> : (
                            <div>
                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                    {events.map((e) => (
                                        <div key={e.id} className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                            <div className="min-w-[60px] text-xs text-gray-400 font-mono text-right pt-1">
                                                {format(new Date(e.created_at), 'HH:mm')}
                                                <div className="text-[10px] opacity-70">{format(new Date(e.created_at), 'dd.MM')}</div>
                                            </div>

                                            <div className="relative pt-1">
                                                <div className={`w-3 h-3 rounded-full mt-1.5 z-10 relative
                                                    ${e.event_type === 'ORDER' ? 'bg-green-500' : ''}
                                                    ${e.event_type === 'ADD_TO_CART' ? 'bg-yellow-500' : ''}
                                                    ${e.event_type === 'PAGE_VIEW' ? 'bg-gray-300 dark:bg-gray-600' : ''}
                                                    ${e.event_type === 'PRODUCT_VIEW' ? 'bg-blue-500' : ''}
                                                `}></div>
                                                {/* Line connection could go here if implemented properly with absolute positioning spanning rows */}
                                            </div>

                                            <div className="flex-1">
                                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                    {getEventTitle(e)}
                                                </div>
                                                {/* Detailed Path or Extra Info */}
                                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                                    {e.event_type === 'PAGE_VIEW' && <span className="font-mono bg-gray-100 dark:bg-black px-1.5 rounded">{e.path}</span>}
                                                    {e.details?.device && <span className="opacity-70 capitalize">• {e.details.device}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {events.length === 0 && <div className="p-8 text-center text-gray-500">Активності не знайдено</div>}
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                                        <div className="text-xs text-gray-500">
                                            Сторінка {currentPage} з {totalPages}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-2 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-white/10"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="p-2 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-white/10"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
