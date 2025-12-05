"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  ChevronDown, Package, Clock, User, Phone, MapPin, CreditCard, Truck
} from "lucide-react";
import ProductImage from "../../components/ProductImage";

// Константи кольорів (твої рідні)
const STATUSES: any = {
  new: { label: "Нове", color: "bg-blue-900/30 text-blue-400 border-blue-800" },
  processing: { label: "В обробці", color: "bg-yellow-900/30 text-yellow-400 border-yellow-800" },
  shipped: { label: "Відправлено", color: "bg-purple-900/30 text-purple-400 border-purple-800" },
  completed: { label: "Виконано", color: "bg-green-900/30 text-green-400 border-green-800" },
  cancelled: { label: "Скасовано", color: "bg-red-900/30 text-red-400 border-red-800" },
};

export default function OrdersClient({ initialOrders }: { initialOrders: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get("status") || "all";

  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Ми використовуємо initialOrders як стартові дані, але Next.js оновить їх при зміні URL
  const orders = initialOrders; 

  const handleFilterChange = (status: string) => {
    // Магія Next.js: замість стейту ми міняємо URL. 
    // Це змушує сервер перерендерити сторінку з новими даними.
    const params = new URLSearchParams(searchParams);
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
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
      // Оновлюємо сторінку без перезавантаження, щоб підтягнути нові дані з сервера
      router.refresh(); 
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Замовлення</h1>
          <p className="text-gray-400 text-sm mt-1">Керування продажами та статусами</p>
        </div>
        
        {/* Фільтр статусів через URL */}
        <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-white/10">
           {["all", "new", "processing"].map((status) => (
             <button 
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition capitalize ${
                  (status === "all" && currentFilter === "all") || currentFilter === status 
                    ? "bg-white text-black" 
                    : "text-gray-400 hover:text-white"
                }`}
             >
                {status === "all" ? "Всі" : STATUSES[status]?.label || status}
             </button>
           ))}
        </div>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-10 text-center bg-[#1a1a1a] rounded-2xl border border-white/5">
            <Package size={48} className="mx-auto text-gray-600 mb-4"/>
            <p className="text-gray-400">Замовлень поки немає</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className={`bg-[#1a1a1a] border rounded-xl overflow-hidden transition ${expandedId === order.id ? "border-blue-500 ring-1 ring-blue-500" : "border-white/5 hover:border-white/20"}`}>
                
                {/* Рядок заголовка */}
                <div className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#222] rounded-full flex items-center justify-center font-bold text-gray-400">
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
    </div>
  );
}