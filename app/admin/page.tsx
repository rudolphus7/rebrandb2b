"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, LogOut, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const router = useRouter();

  // Дані
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalMoney: 0, totalOrders: 0 });

  // Стан форми товарів
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // --- ЗАВАНТАЖЕННЯ ДАНИХ ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/");
      setSession(session);
      fetchData();
    });
  }, []);

  async function fetchData() {
    // 1. Беремо товари
    const { data: productsData } = await supabase.from("products").select("*").order('id', { ascending: false });
    setProducts(productsData || []);

    // 2. Беремо замовлення
    const { data: ordersData } = await supabase.from("orders").select("*").order('created_at', { ascending: false });
    setOrders(ordersData || []);

    // 3. Рахуємо статистику
    if (ordersData) {
      const total = ordersData.reduce((sum, order) => sum + (order.total_price || 0), 0);
      setStats({ totalMoney: total, totalOrders: ordersData.length });
    }
  }

  // --- ФУНКЦІЇ ТОВАРІВ ---
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !newTitle || !newPrice) return alert("Заповніть всі поля!");
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from('products').insert([
        { title: newTitle, price: parseFloat(newPrice), image_url: publicUrl }
      ]);
      if (dbError) throw dbError;

      alert("Товар додано!");
      setNewTitle(""); setNewPrice(""); setFile(null);
      fetchData(); // Оновити все
    } catch (error: any) {
      alert("Помилка: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteProduct(id: number) {
    if (!confirm("Видалити товар?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchData();
  }

  // --- HTML СТРУКТУРА ---
  if (!session) return <div className="p-10 text-center">Завантаження панелі...</div>;

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
      
      {/* 1. БОКОВЕ МЕНЮ (SIDEBAR) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold tracking-wider">BRANDZILLA</h2>
          <p className="text-xs text-slate-400 mt-1">Admin Panel</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "dashboard" ? "bg-blue-600" : "hover:bg-slate-800"}`}
          >
            <LayoutDashboard size={20} /> Головна
          </button>
          
          <button 
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "orders" ? "bg-blue-600" : "hover:bg-slate-800"}`}
          >
            <ShoppingBag size={20} /> Замовлення
          </button>

          <button 
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "products" ? "bg-blue-600" : "hover:bg-slate-800"}`}
          >
            <Package size={20} /> Товари
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <LogOut size={16} /> На сайт
          </button>
        </div>
      </aside>

      {/* 2. ОСНОВНА ЧАСТИНА (CONTENT) */}
      <main className="ml-64 flex-1 p-8">
        
        {/* === Вклдака: ДАШБОРД === */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6">Огляд бізнесу</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Картка 1 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 mb-1">Загальний дохід</p>
                <h3 className="text-3xl font-bold text-green-600">{stats.totalMoney} грн</h3>
              </div>
              {/* Картка 2 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 mb-1">Всього замовлень</p>
                <h3 className="text-3xl font-bold text-blue-600">{stats.totalOrders}</h3>
              </div>
              {/* Картка 3 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 mb-1">Активних товарів</p>
                <h3 className="text-3xl font-bold text-purple-600">{products.length}</h3>
              </div>
            </div>
          </div>
        )}

        {/* === Вкладка: ЗАМОВЛЕННЯ === */}
        {activeTab === "orders" && (
          <div>
             <h1 className="text-3xl font-bold mb-6">Історія замовлень</h1>
             <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4 font-semibold text-gray-600">№ / Дата</th>
                      <th className="p-4 font-semibold text-gray-600">Клієнт</th>
                      <th className="p-4 font-semibold text-gray-600">Деталі замовлення</th>
                      <th className="p-4 font-semibold text-gray-600">Сума</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="p-4 align-top">
                          <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">#{order.id}</span>
                          <div className="text-sm text-gray-500 mt-1">
                            {order.created_at ? format(new Date(order.created_at), 'd MMM HH:mm', { locale: uk }) : '-'}
                          </div>
                        </td>
                        <td className="p-4 align-top font-medium">{order.user_email}</td>
                        <td className="p-4 align-top">
                          {/* Розбираємо JSON з товарами */}
                          <ul className="text-sm space-y-1">
                            {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="text-gray-400">•</span> {item.title}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="p-4 align-top font-bold text-green-700">{order.total_price} грн</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <div className="p-8 text-center text-gray-500">Замовлень поки немає</div>}
             </div>
          </div>
        )}

        {/* === Вкладка: ТОВАРИ (Те, що було раніше) === */}
        {activeTab === "products" && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Управління товарами</h1>
            
            {/* Форма додавання */}
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"> <Plus size={20}/> Додати новий товар</h2>
              <form onSubmit={handleAddProduct} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="text-sm text-gray-500">Назва</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border p-2 rounded mt-1" placeholder="Брендоване Худі" />
                </div>
                <div className="w-32">
                  <label className="text-sm text-gray-500">Ціна</label>
                  <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full border p-2 rounded mt-1" placeholder="0" />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-sm text-gray-500">Картинка</label>
                  <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full mt-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700" />
                </div>
                <button disabled={uploading} className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-slate-800 disabled:opacity-50">
                  {uploading ? "..." : "Створити"}
                </button>
              </form>
            </div>

            {/* Список товарів */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex gap-4 items-start">
                  <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-full h-full p-4 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.price} грн</p>
                  </div>
                  <button onClick={() => handleDeleteProduct(item.id)} className="text-red-400 hover:text-red-600 p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}