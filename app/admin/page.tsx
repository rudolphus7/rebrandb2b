"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, ShoppingBag, Package, LogOut, Plus, Trash2, 
  Image as ImageIcon, Search, Pencil, X, CheckCircle, Clock, Truck, Megaphone, RefreshCw 
} from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalMoney: 0, totalOrders: 0 });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    title: "", price: "", subtitle: "", description: "",
    brand: "", sku: "" // <--- НОВІ ПОЛЯ
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Синхронізувати з Totobi");

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

    const { data: bannersData } = await supabase.from("banners").select("*").order('id', { ascending: false });
    setBanners(bannersData || []);

    if (ordersData) {
      const total = ordersData.reduce((sum, order) => sum + (order.total_price || 0), 0);
      setStats({ totalMoney: total, totalOrders: ordersData.length });
    }
  }

  async function handleSync() {
    if(!confirm("Почати повну синхронізацію?")) return;
    setIsSyncing(true);
    let offset = 0; let limit = 50; let isFinished = false; let totalProcessed = 0;
    try {
      while (!isFinished) {
        setSyncStatus(`⏳ Оброблено ${offset}...`);
        const res = await fetch(`/api/sync?offset=${offset}&limit=${limit}`);
        if (!res.ok) throw new Error("Помилка сервера");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.done) isFinished = true;
        else { totalProcessed += (data.processed || 0); offset = data.nextOffset; }
      }
      alert(`Успішно! Оброблено товарів: ${totalProcessed}`);
      fetchData();
    } catch (e: any) { alert("Помилка: " + e.message); } 
    finally { setIsSyncing(false); setSyncStatus("Синхронізувати з Totobi"); }
  }

  async function uploadImage(bucket: string) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrl = null;
      if (file) imageUrl = await uploadImage('products');
      const data: any = { 
        title: formData.title, 
        price: parseFloat(formData.price),
        brand: formData.brand, // <--- Зберігаємо бренд
        sku: formData.sku // <--- Зберігаємо артикул
      };
      if (imageUrl) data.image_url = imageUrl;

      if (editingId) await supabase.from('products').update(data).eq('id', editingId);
      else {
         if(!imageUrl) return alert("Фото обов'язкове");
         data.image_url = imageUrl;
         await supabase.from('products').insert([data]);
      }
      resetForm(); fetchData();
    } catch (e: any) { alert(e.message); } finally { setUploading(false); }
  }

  async function handleBannerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrl = null;
      if (file) imageUrl = await uploadImage('banners');
      const data: any = { title: formData.title, subtitle: formData.subtitle, description: formData.description };
      if (imageUrl) data.image_url = imageUrl;

      if (editingId) await supabase.from('banners').update(data).eq('id', editingId);
      else {
         if(!imageUrl) return alert("Фото обов'язкове");
         data.image_url = imageUrl;
         await supabase.from('banners').insert([data]);
      }
      resetForm(); fetchData();
    } catch (e: any) { alert(e.message); } finally { setUploading(false); }
  }

  async function deleteItem(table: string, id: number) {
    if (!confirm("Видалити?")) return;
    await supabase.from(table).delete().eq("id", id);
    fetchData();
  }

  function startEditing(item: any, type: 'product' | 'banner') {
    setEditingId(item.id);
    if (type === 'product') {
        setFormData({ 
            title: item.title || "", price: item.price || "", 
            subtitle: "", description: "",
            brand: item.brand || "", sku: item.sku || "" // <--- Заповнюємо
        });
    } else {
        setFormData({ 
            title: item.title || "", price: "", 
            subtitle: item.subtitle || "", description: item.description || "",
            brand: "", sku: "" 
        });
    }
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setFormData({ title: "", price: "", subtitle: "", description: "", brand: "", sku: "" });
    setFile(null);
  }

  if (!session) return <div className="p-10 text-center">Завантаження...</div>;

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold tracking-wider italic">REBRAND</h2>
          <p className="text-xs text-slate-400 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "dashboard" ? "bg-blue-600" : "hover:bg-slate-800"}`}> <LayoutDashboard size={20} /> Головна </button>
          <button onClick={() => setActiveTab("orders")} className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "orders" ? "bg-blue-600" : "hover:bg-slate-800"}`}> <ShoppingBag size={20} /> Замовлення </button>
          <button onClick={() => setActiveTab("products")} className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "products" ? "bg-blue-600" : "hover:bg-slate-800"}`}> <Package size={20} /> Товари </button>
          <button onClick={() => setActiveTab("banners")} className={`flex items-center gap-3 w-full p-3 rounded transition ${activeTab === "banners" ? "bg-blue-600" : "hover:bg-slate-800"}`}> <Megaphone size={20} /> Банери </button>
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
                <p className="text-gray-500 mb-1">Дохід</p>
                <h3 className="text-3xl font-bold text-green-600">{stats.totalMoney} ₴</h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 mb-1">Замовлень</p>
                <h3 className="text-3xl font-bold text-blue-600">{stats.totalOrders}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 mb-1">Товарів</p>
                <h3 className="text-3xl font-bold text-purple-600">{products.length}</h3>
              </div>
            </div>
          </div>
        )}

        {activeTab === "banners" && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Банери</h1>
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">{editingId ? "Редагувати" : "Додати банер"}</h2>
              <form onSubmit={handleBannerSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="border p-2 rounded" placeholder="Заголовок" required />
                  <input type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="border p-2 rounded" placeholder="Підзаголовок" required />
                </div>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded" placeholder="Опис" required />
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
                <button disabled={uploading} className="bg-slate-900 text-white px-6 py-2 rounded">{uploading ? "..." : "Зберегти"}</button>
              </form>
            </div>
            <div className="space-y-4">
              {banners.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl flex gap-4 items-center shadow-sm">
                   <div className="w-24 h-16 bg-gray-200 rounded overflow-hidden">{item.image_url && <img src={item.image_url} className="w-full h-full object-cover"/>}</div>
                   <div className="flex-1"><h3 className="font-bold">{item.title}</h3><p className="text-xs text-gray-500">{item.subtitle}</p></div>
                   <button onClick={() => deleteItem('banners', item.id)} className="text-red-500"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div>
             <h1 className="text-3xl font-bold mb-6">Замовлення</h1>
             <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b"><tr><th className="p-4">ID</th><th className="p-4">Клієнт</th><th className="p-4">Сума</th><th className="p-4">Статус</th></tr></thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 border-b last:border-0">
                        <td className="p-4">#{order.id}</td>
                        <td className="p-4">{order.user_email}</td>
                        <td className="p-4 font-bold">{order.total_price} ₴</td>
                        <td className="p-4">
                           <select 
                              className="border rounded p-1 text-sm bg-white"
                              value={order.status || 'new'}
                              onChange={async (e) => { await supabase.from('orders').update({ status: e.target.value }).eq('id', order.id); fetchData(); }}
                            >
                              <option value="new">Нове</option>
                              <option value="processing">В роботі</option>
                              <option value="shipped">Відправлено</option>
                              <option value="canceled">Скасовано</option>
                            </select>
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
            <div className="flex justify-between items-center mb-6">
               <h1 className="text-3xl font-bold">Товари</h1>
               <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-wait">
                 <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} /> {syncStatus}
               </button>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1"><label className="text-xs font-bold text-gray-500">Назва</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded" required /></div>
                  <div className="w-32"><label className="text-xs font-bold text-gray-500">Ціна</label><input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border p-2 rounded" required /></div>
                </div>
                <div className="flex gap-4 items-end">
                  <div className="flex-1"><label className="text-xs font-bold text-gray-500">Бренд</label><input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full border p-2 rounded" placeholder="Gildan" /></div>
                  <div className="flex-1"><label className="text-xs font-bold text-gray-500">Артикул (SKU)</label><input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full border p-2 rounded" placeholder="123-456" /></div>
                  <div className="flex-1"><label className="text-xs font-bold text-gray-500">Фото</label><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm" /></div>
                </div>
                <button disabled={uploading} className="bg-slate-900 text-white px-6 py-2 rounded">{uploading ? "..." : "Зберегти"}</button>
              </form>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {products.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex gap-4 items-start">
                  <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-4 text-gray-300" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.price} ₴</p>
                    <p className="text-xs text-gray-400 mt-1">{item.brand} | {item.sku}</p>
                  </div>
                  <button onClick={() => deleteItem('products', item.id)} className="text-red-500"><Trash2 size={18}/></button>
                  <button onClick={() => startEditing(item, 'product')} className="text-blue-500"><Pencil size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}