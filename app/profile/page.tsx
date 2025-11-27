"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { User, Package, Clock, ArrowLeft, LogOut } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

export default function UserProfile() {
  const [session, setSession] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Перевіряємо вхід
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/"); // Немає входу -> на головну
      } else {
        setSession(session);
        fetchMyOrders(session.user.email);
      }
    });
  }, []);

  // 2. Вантажимо ТІЛЬКИ свої замовлення
  async function fetchMyOrders(email: string | undefined) {
    if (!email) return;
    
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_email", email) // Фільтр по email
      .order("created_at", { ascending: false }); // Спочатку нові

    if (!error) setOrders(data || []);
    setLoading(false);
  }

  // 3. Функція виходу
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // Хелпери для кольорів статусу (такі ж, як в адмінці)
  const getStatusBadge = (status: string) => {
    const styles = {
      new: "bg-yellow-100 text-yellow-800 border-yellow-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200",
      shipped: "bg-green-100 text-green-800 border-green-200",
      canceled: "bg-red-100 text-red-800 border-red-200",
    };
    const labels = {
      new: "Очікує підтвердження",
      processing: "В роботі",
      shipped: "Відправлено",
      canceled: "Скасовано",
    };
    const key = status as keyof typeof styles;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[key] || "bg-gray-100"}`}>
        {labels[key] || status}
      </span>
    );
  };

  if (loading) return <div className="p-10 text-center">Завантаження кабінету...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* ШАПКА ПРОФІЛЮ */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <User size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Мій Кабінет</h1>
              <p className="text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50 transition"
            >
              <ArrowLeft size={18} /> Магазин
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
            >
              <LogOut size={18} /> Вийти
            </button>
          </div>
        </div>

        {/* СПИСОК ЗАМОВЛЕНЬ */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="text-blue-600"/> Історія замовлень
        </h2>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed">
            <p className="text-gray-400 mb-4">Ви ще нічого не замовляли</p>
            <button onClick={() => router.push("/")} className="text-blue-600 font-bold hover:underline">
              Перейти до покупок
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                
                {/* Заголовок картки замовлення */}
                <div className="bg-gray-50 p-4 border-b flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-gray-700">#{order.id}</span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock size={14}/>
                      {order.created_at ? format(new Date(order.created_at), 'd MMMM yyyy, HH:mm', { locale: uk }) : ''}
                    </span>
                  </div>
                  <div>
                    {getStatusBadge(order.status || 'new')}
                  </div>
                </div>

                {/* Вміст замовлення */}
                <div className="p-4">
                  <div className="space-y-2 mb-4">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b border-dashed pb-2 last:border-0 last:pb-0">
                        <span className="text-gray-800 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                          {item.title}
                        </span>
                        <span className="font-medium text-gray-600">{item.price} грн</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end pt-2 border-t mt-2">
                    <div className="text-right">
                      <span className="text-gray-500 text-sm mr-2">Разом:</span>
                      <span className="text-xl font-bold text-green-700">{order.total_price} грн</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}