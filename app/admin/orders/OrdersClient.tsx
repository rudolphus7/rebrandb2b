"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  ChevronDown, Package, Clock, User, Phone, MapPin, CreditCard, Truck, Calendar, ChevronLeft, ChevronRight, X
} from "lucide-react";
import ProductImage from "../../components/ProductImage";

// Константи кольорів
const STATUSES: any = {
  new: { label: "Нове", color: "bg-blue-900/30 text-blue-400 border-blue-800" },
  processing: { label: "В обробці", color: "bg-yellow-900/30 text-yellow-400 border-yellow-800" },
  shipped: { label: "Відправлено", color: "bg-purple-900/30 text-purple-400 border-purple-800" },
  completed: { label: "Виконано", color: "bg-green-900/30 text-green-400 border-green-800" },
  cancelled: { label: "Скасовано", color: "bg-red-900/30 text-red-400 border-red-800" },
};

interface OrdersClientProps {
  initialOrders: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default function OrdersClient({ initialOrders, totalCount, totalPages, currentPage }: OrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentFilter = searchParams.get("status") || "all";
  const dateFromParam = searchParams.get("dateFrom") || "";
  const dateToParam = searchParams.get("dateTo") || "";

  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Локальний стейт для дат (щоб не перезавантажувати сторінку при кожному введенні символу)
  const [dateFrom, setDateFrom] = useState(dateFromParam);
  const [dateTo, setDateTo] = useState(dateToParam);

  // Оновлення URL параметрів (це тригер для серверного оновлення даних)
  const updateParams = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // При зміні фільтрів завжди скидаємо на 1 сторінку
    if (newParams.page === undefined) {
        params.set("page", "1");
    }

    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleFilterChange = (status: string) => {
    updateParams({ status: status === "all" ? null : status });
  };

  const handleDateApply = () => {
    updateParams({ dateFrom, dateTo });
  };

  const handleDateClear = () => {
    setDateFrom("");
    setDateTo("");
    updateParams({ dateFrom: null, dateTo: null });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/admin/orders?${params.toString()}`);
  };

  async function updateStatus(id: number, newStatus: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Помилка оновлення: " + error.message);
    } else {
      router.refresh(); 
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      {/* --- Верхня панель: Заголовок + Фільтри + Дати --- */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Замовлення <span className="text-gray-500 text-lg font-normal ml-2">({totalCount})</span></h1>
              <p className="text-gray-400 text-sm mt-1">Керування продажами та статусами</p>
            </div>

            {/* Фільтр статусів */}
            <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
              {["all", "new", "processing", "shipped", "completed", "cancelled"].map((status) => (
                <button 
                    key={status}
                    onClick={() => handleFilterChange(status)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition capitalize whitespace-nowrap ${
                      (status === "all" && currentFilter === "all") || currentFilter === status 
                        ? "bg-white text-black shadow-md" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                    {status === "all" ? "Всі" : STATUSES[status]?.label || status}
                </button>
              ))}
            </div>
        </div>

        {/* Панель фільтрації по датах */}
        <div className="flex flex-wrap items-center gap-4 bg-[#111] p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar size={16} />
                <span className="font-medium text-white">Період:</span>
            </div>
            
            <div className="flex items-center gap-2">
                <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-[#1a1a1a] border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition w-36"
                />
                <span className="text-gray-500">-</span>
                <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-[#1a1a1a] border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition w-36"
                />
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={handleDateApply}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-blue-900/20"
                >
                    Застосувати
                </button>
                {(dateFrom || dateTo) && (
                    <button 
                        onClick={handleDateClear}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                        title="Скинути дати"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* --- Список замовлень --- */}
      <div className="space-y-4 min-h-[400px]">
        {initialOrders.length === 0 ? (
          <div className="p-16 text-center bg-[#1a1a1a] rounded-2xl border border-white/5 flex flex-col items-center justify-center">
            <Package size={64} className="text-gray-700 mb-6"/>
            <p className="text-xl text-white font-bold mb-2">Замовлень не знайдено</p>
            <p className="text-gray-500">Спробуйте змінити фільтри або дати</p>
            {(dateFromParam || dateToParam || currentFilter !== 'all') && (
                <button onClick={() => { handleDateClear(); handleFilterChange('all'); }} className="mt-6 text-blue-400 hover:underline">
                    Скинути всі фільтри
                </button>
            )}
          </div>
        ) : (
          initialOrders.map((order) => (
            <div key={order.id} className={`bg-[#1a1a1a] border rounded-xl overflow-hidden transition ${expandedId === order.id ? "border-blue-500 ring-1 ring-blue-500" : "border-white/5 hover:border-white/20"}`}>
                
                {/* Рядок заголовка */}
                <div className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition" onClick={() => toggleExpand(order.id)}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#222] rounded-full flex items-center justify-center font-bold text-gray-400 text-sm">
                            #{order.id}
                        </div>
                        <div>
                            <div className="font-bold text-white text-lg">
                                {order.total_price} ₴
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                <Clock size={12}/> {new Date(order.created_at).toLocaleString('uk-UA')}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 flex-1 md:justify-end w-full md:w-auto">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <User size={16} className="text-gray-500"/> 
                            {order.delivery_data?.fullName || "Гість"}
                        </div>
                        
                        <div onClick={(e) => e.stopPropagation()} className="relative">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${STATUSES[order.status]?.color || "text-gray-400 border-gray-700"}`}>
                                {STATUSES[order.status]?.label || order.status}
                            </span>
                        </div>

                        <ChevronDown size={20} className={`text-gray-500 transition-transform duration-300 ${expandedId === order.id ? "rotate-180" : ""}`}/>
                    </div>
                </div>

                {/* Розгорнуті деталі */}
                {expandedId === order.id && (
                    <div className="border-t border-white/10 bg-[#111] p-6 animate-in slide-in-from-top-2 fade-in duration-200">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* Товари */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><Package size={14}/> Товари в замовленні</h4>
                                <div className="space-y-3">
                                    {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex gap-4 bg-[#1a1a1a] p-3 rounded-lg border border-white/5">
                                            <div className="w-12 h-12 bg-black rounded overflow-hidden relative flex-shrink-0">
                                                {item.image_url && <ProductImage src={item.image_url} alt={item.title} fill className="object-cover"/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-white truncate">{item.title}</div>
                                                <div className="text-xs text-gray-500">
                                                    {item.selectedSize && <span className="bg-[#222] px-1.5 py-0.5 rounded mr-2">{item.selectedSize}</span>}
                                                    {item.quantity} шт x {item.price} ₴
                                                </div>
                                            </div>
                                            <div className="text-sm font-bold text-white">
                                                {item.price * item.quantity} ₴
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Доставка і Клієнт */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><User size={14}/> Дані клієнта</h4>
                                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 space-y-2 text-sm">
                                        <div className="flex items-center gap-3"><User size={16} className="text-blue-500"/> <span className="text-white">{order.delivery_data?.fullName}</span></div>
                                        <div className="flex items-center gap-3"><Phone size={16} className="text-blue-500"/> <span className="text-white">{order.delivery_data?.phone}</span></div>
                                        {order.user_email && <div className="flex items-center gap-3 ml-0.5 text-gray-400 text-xs">@{order.user_email}</div>}
                                        {order.delivery_data?.comment && (
                                            <div className="mt-2 p-3 bg-[#222] rounded-lg text-yellow-200/80 text-xs italic border border-yellow-900/30">
                                                " {order.delivery_data.comment} "
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><Truck size={14}/> Доставка та Оплата</h4>
                                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 space-y-3 text-sm">
                                        <div className="flex items-start gap-3">
                                            <MapPin size={16} className="text-green-500 mt-0.5 flex-shrink-0"/> 
                                            <div>
                                                <div className="text-white font-bold">{order.delivery_data?.city}</div>
                                                <div className="text-gray-400 text-xs">{order.delivery_data?.warehouse}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <CreditCard size={16} className="text-green-500"/> 
                                            <span className="text-white">
                                                {order.delivery_data?.payment === "invoice" ? "Рахунок (ФОП/ТОВ)" : "Оплата карткою"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Керування статусом */}
                        <div className="flex justify-end gap-3 border-t border-white/5 pt-6 flex-wrap">
                            <span className="text-sm text-gray-500 self-center mr-2">Змінити статус:</span>
                            <button onClick={() => updateStatus(order.id, 'processing')} className="px-4 py-2 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/40 rounded-lg text-sm font-bold border border-yellow-600/50 transition">В обробку</button>
                            <button onClick={() => updateStatus(order.id, 'shipped')} className="px-4 py-2 bg-purple-600/20 text-purple-500 hover:bg-purple-600/40 rounded-lg text-sm font-bold border border-purple-600/50 transition">Відправлено</button>
                            <button onClick={() => updateStatus(order.id, 'completed')} className="px-4 py-2 bg-green-600/20 text-green-500 hover:bg-green-600/40 rounded-lg text-sm font-bold border border-green-600/50 transition">Виконано</button>
                            <button onClick={() => updateStatus(order.id, 'cancelled')} className="px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/40 rounded-lg text-sm font-bold border border-red-600/50 transition">Скасувати</button>
                        </div>

                    </div>
                )}
            </div>
          ))
        )}
      </div>

      {/* --- Пагінація --- */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8 pb-8">
            <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-3 bg-[#1a1a1a] rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
                <ChevronLeft size={20} />
            </button>
            
            <div className="text-sm font-bold text-gray-400">
                Сторінка <span className="text-white">{currentPage}</span> з {totalPages}
            </div>

            <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-3 bg-[#1a1a1a] rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
                <ChevronRight size={20} />
            </button>
        </div>
      )}
    </div>
  );
}