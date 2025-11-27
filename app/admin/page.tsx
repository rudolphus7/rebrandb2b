"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, LogOut, Plus, Trash2, Image as ImageIcon, Search, Pencil, X, CheckCircle, Clock, Truck, AlertCircle } from "lucide-react";
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

  // Пошук і Форми
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/");
      setSession(session);
      fetchData();
    });
  }, []);

  async function fetchData() {
    const { data: productsData } = await supabase.from("products").select("*").order('id', { ascending: false });
    setProducts(productsData || []);

    const { data: ordersData } = await supabase.from("orders").select("*").order('created_at', { ascending: false });
    setOrders(ordersData || []);

    if (ordersData) {
      const total = ordersData.reduce((sum, order) => sum + (order.total_price || 0), 0);
      setStats({ totalMoney: total, totalOrders: ordersData.length });
    }
  }

  // --- ЗМІНА СТАТУСУ ЗАМОВЛЕННЯ ---
  async function updateStatus(orderId: number, newStatus: string) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      alert("Помилка оновлення статусу");
    } else {
      fetchData(); // Оновити таблицю, щоб побачити зміни
    }
  }

  // Функція для кольору статусу
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-green-100 text-green-800 border-green-200';
      case 'canceled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Нове';
      case 'processing': return 'В роботі';
      case 'shipped': return 'Відправлено';
      case 'canceled': return 'Скасовано';
      default: return status;
    }
  };

  // --- ЛОГІКА ТОВАРІВ ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle || !newPrice) return alert("Заповніть поля!");
    setUploading(true);
    try {
      let imageUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      if (editingId) {
        const updateData: any = { title: newTitle, price: parseFloat(newPrice) };
        if (imageUrl) updateData.image_url = imageUrl;
        await supabase.from('products').update(updateData).eq('id', editingId);
      } else {
        if (!imageUrl && !editingId) return alert("Фото обов'язкове!");
        await supabase.from('products').insert([{ title: newTitle, price: parseFloat(newPrice), image_url: imageUrl }]);
      }
      resetForm();
      fetchData();
    } catch (error: any) { alert(error.message); } finally { setUploading(false); }
  }

  function startEditing(product: any) {
    setEditingId(product.id);
    setNewTitle(product.title);
    setNewPrice(product.price);
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null); setNewTitle(""); setNewPrice(""); setFile(null);
  }

  async function handleDeleteProduct(id: number) {
    if (!confirm("Видалити?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchData();
  }

  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!session) return <div className="p-10 text-center">Завантаження...</div>;

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold tracking-wider">BRANDZILLA</h2>
          <p className="text-xs text-slate-400 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "dashboard" ? "bg-blue-600" : "hover:bg-slate-800"}`}> <LayoutDashboard size={20} /> Головна </button>
          <button onClick={() => setActiveTab("orders")} className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "orders" ? "bg-blue-600" : "hover:bg-slate-800"}`}> <ShoppingBag size={20} /> Замовлення </button>
          <button onClick={() => setActiveTab("products")} className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "products" ? "bg-blue-600" : "hover:bg-slate-800"}`}> <Package size={20} /> Товари </button>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-400 hover:text-white transition"> <LogOut size={16} /> На сайт </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-6">Огляд бізнесу</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 mb-1">Загальний дохід</p>
                <h3 className="text-3xl font-bold text-green-600">{stats.totalMoney} грн</h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 mb-1">Всього замовлень</p>
                <h3 className="text-3xl font-bold text-blue-600">{stats.totalOrders}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 mb-1">Товарів</p>
                <h3 className="text-3xl font-bold text-purple-600">{products.length}</h3>
              </div>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div>
             <h1 className="text-3xl font-bold mb-6">Історія замовлень</h1>
             <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4 font-semibold text-gray-600">ID / Дата</th>
                      <th className="p-4 font-semibold text-gray-600">Клієнт</th>
                      <th className="p-4 font-semibold text-gray-600 w-1/3">Замовлення</th>
                      <th className="p-4 font-semibold text-gray-600">Сума</th>
                      <th className="p-4 font-semibold text-gray-600">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition">
                        <td className="p-4 align-top">
                          <span className="font-mono text-xs text-gray-500">#{order.id}</span>
                          <div className="text-sm font-medium mt-1">
                            {order.created_at ? format(new Date(order.created_at), 'd MMM HH:mm', { locale: uk }) : '-'}
                          </div>
                        </td>
                        <td className="p-4 align-top font-medium text-gray-800">{order.user_email}</td>
                        <td className="p-4 align-top">
                          <ul className="text-sm space-y-1 text-gray-600">
                            {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> {item.title}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="p-4 align-top font-bold text-gray-800">{order.total_price} грн</td>
                        <td className="p-4 align-top">
                          <div className="flex flex-col gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border w-fit ${getStatusColor(order.status || 'new')}`}>
                              {getStatusLabel(order.status || 'new')}
                            </span>
                            <select 
                              className="text-sm border rounded p-1 bg-white cursor-pointer outline-none hover:border-blue-400 transition"
                              value={order.status || 'new'}
                              onChange={(e) => updateStatus(order.id, e.target.value)}
                            >
                              <option value="new">🟡 Нове</option>
                              <option value="processing">🔵 В роботі</option>
                              <option value="shipped">🟢 Відправлено</option>
                              <option value="canceled">🔴 Скасовано</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === "products" && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Товари</h1>
            
            <div className={`p-6 rounded-xl shadow-sm mb-8 border transition-all ${editingId ? "bg-blue-50 border-blue-200" : "bg-white border-gray-100"}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {editingId ? <><Pencil size={20} className="text-blue-600"/> Редагувати</> : <><Plus size={20}/> Новий товар</>}
                </h2>
                {editingId && (
                  <button onClick={resetForm} className="text-sm text-red-500 hover:underline flex items-center gap-1"><X size={16}/> Скасувати</button>
                )}
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full"> <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Назва</label> <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white" placeholder="Назва товару" /> </div>
                <div className="w-32"> <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ціна</label> <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white" placeholder="0" /> </div>
                <div className="flex-1 w-full"> <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Фото</label> <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full mt-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-white file:text-blue-700 border rounded bg-white" /> </div>
                <button disabled={uploading} className={`${editingId ? "bg-blue-600" : "bg-slate-900"} text-white px-6 py-2 rounded font-medium disabled:opacity-50`}> {uploading ? "..." : (editingId ? "Зберегти" : "Створити")} </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
              <div className="p-4 border-b flex items-center gap-2 bg-gray-50"> <Search className="text-gray-400" size={20} /> <input type="text" placeholder="Пошук..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent outline-none w-full text-gray-700" /> </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b"> <tr> <th className="p-4 font-semibold text-gray-600 w-20">Фото</th> <th className="p-4 font-semibold text-gray-600">Назва</th> <th className="p-4 font-semibold text-gray-600 w-32">Ціна</th> <th className="p-4 font-semibold text-gray-600 w-40 text-right">Дії</th> </tr> </thead>
                <tbody className="divide-y">
                  {filteredProducts.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="p-3"> <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden border"> {item.image_url && <img src={item.image_url} className="w-full h-full object-cover" />} </div> </td>
                      <td className="p-3 font-medium text-gray-800">{item.title}</td>
                      <td className="p-3 font-bold text-gray-600">{item.price} грн</td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => startEditing(item)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Pencil size={18} /></button>
                        <button onClick={() => handleDeleteProduct(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}