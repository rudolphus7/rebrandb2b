"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, ShoppingBag, Package, LogOut, Plus, Trash2, 
  Image as ImageIcon, Search, Pencil, X, CheckCircle, Clock, Truck, Megaphone 
} from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const router = useRouter();

  // Дані
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]); // <--- НОВЕ
  const [stats, setStats] = useState({ totalMoney: 0, totalOrders: 0 });

  // Пошук і Форми
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Стан для форми Товарів/Банерів
  const [formData, setFormData] = useState({
    title: "",
    price: "",      // Тільки для товарів
    subtitle: "",   // Тільки для банерів
    description: "",// Тільки для банерів
  });
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

    // НОВЕ: Вантажимо банери
    const { data: bannersData } = await supabase.from("banners").select("*").order('id', { ascending: false });
    setBanners(bannersData || []);

    if (ordersData) {
      const total = ordersData.reduce((sum, order) => sum + (order.total_price || 0), 0);
      setStats({ totalMoney: total, totalOrders: ordersData.length });
    }
  }

  // --- УНІВЕРСАЛЬНИЙ ЗАВАНТАЖУВАЧ ФОТО ---
  async function uploadImage(bucket: string) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  }

  // --- ЛОГІКА ТОВАРІВ (ЗБЕРЕЖЕННЯ) ---
  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrl = null;
      if (file) imageUrl = await uploadImage('products');

      const dataToSave: any = { title: formData.title, price: parseFloat(formData.price) };
      if (imageUrl) dataToSave.image_url = imageUrl;

      if (editingId) {
        await supabase.from('products').update(dataToSave).eq('id', editingId);
      } else {
        if (!imageUrl && !editingId) return alert("Фото обов'язкове!");
        dataToSave.image_url = imageUrl; // Для нових обов'язково
        await supabase.from('products').insert([dataToSave]);
      }
      resetForm(); fetchData(); alert("Товар збережено!");
    } catch (error: any) { alert(error.message); } finally { setUploading(false); }
  }

  // --- ЛОГІКА БАНЕРІВ (ЗБЕРЕЖЕННЯ) ---
  async function handleBannerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrl = null;
      if (file) imageUrl = await uploadImage('banners'); // В інший бакет

      const dataToSave: any = { 
        title: formData.title, 
        subtitle: formData.subtitle,
        description: formData.description 
      };
      if (imageUrl) dataToSave.image_url = imageUrl;

      if (editingId) {
        await supabase.from('banners').update(dataToSave).eq('id', editingId);
      } else {
        if (!imageUrl) return alert("Банер без фото не має сенсу!");
        dataToSave.image_url = imageUrl;
        await supabase.from('banners').insert([dataToSave]);
      }
      resetForm(); fetchData(); alert("Банер збережено!");
    } catch (error: any) { alert(error.message); } finally { setUploading(false); }
  }

  // --- ВИДАЛЕННЯ ---
  async function deleteItem(table: string, id: number) {
    if (!confirm("Видалити запис?")) return;
    await supabase.from(table).delete().eq("id", id);
    fetchData();
  }

  // --- ХЕЛПЕРИ ФОРМИ ---
  function startEditing(item: any, type: 'product' | 'banner') {
    setEditingId(item.id);
    setFormData({
      title: item.title || "",
      price: item.price || "",
      subtitle: item.subtitle || "",
      description: item.description || ""
    });
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setFormData({ title: "", price: "", subtitle: "", description: "" });
    setFile(null);
  }

  const getStatusLabel = (s: string) => ({ new: 'Нове', processing: 'В роботі', shipped: 'Відправлено', canceled: 'Скасовано' }[s] || s);

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
        
        {/* === DASHBOARD === */}
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
                <p className="text-gray-500 mb-1">Активних банерів</p>
                <h3 className="text-3xl font-bold text-purple-600">{banners.length}</h3>
              </div>
            </div>
          </div>
        )}

        {/* === BANNERS (НОВА ВКЛАДКА) === */}
        {activeTab === "banners" && (
          <div>
            <h1 className="text-3xl font-bold mb-6">Банери на головній</h1>
            
            {/* Форма банера */}
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">{editingId ? "Редагувати банер" : "Додати новий банер"}</h2>
              <form onSubmit={handleBannerSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Заголовок (Великий)</label>
                    <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded mt-1" placeholder="НОВА КОЛЕКЦІЯ" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Підзаголовок (Кольоровий)</label>
                    <input type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full border p-2 rounded mt-1" placeholder="WINTER 2025" required />
                  </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Опис</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border p-2 rounded mt-1" placeholder="Короткий опис акції..." required />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Фон (Картинка)</label>
                  <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full mt-1 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button disabled={uploading} className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-slate-800 disabled:opacity-50">
                    {uploading ? "Завантаження..." : (editingId ? "Зберегти зміни" : "Створити банер")}
                  </button>
                  {editingId && <button type="button" onClick={resetForm} className="text-red-500 px-4 py-2">Скасувати</button>}
                </div>
              </form>
            </div>

            {/* Список банерів */}
            <div className="grid grid-cols-1 gap-4">
              {banners.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex gap-4 items-center">
                  <div className="w-32 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0 relative">
                    {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="m-auto text-gray-300"/>}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{item.title}</h3>
                    <p className="text-sm text-blue-600 font-bold">{item.subtitle}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditing(item, 'banner')} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={18}/></button>
                    <button onClick={() => deleteItem('banners', item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === ORDERS & PRODUCTS (СТАРИЙ КОД) === */}
        {activeTab === "orders" && (
          <div>
             <h1 className="text-3xl font-bold mb-6">Замовлення</h1>
             <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b"><tr><th className="p-4 text-gray-600">ID</th><th className="p-4 text-gray-600">Клієнт</th><th className="p-4 text-gray-600">Сума</th><th className="p-4 text-gray-600">Статус</th></tr></thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="p-4 text-sm">#{order.id} <br/><span className="text-gray-400 text-xs">{format(new Date(order.created_at), 'dd.MM HH:mm')}</span></td>
                        <td className="p-4 font-medium">{order.user_email}</td>
                        <td className="p-4 font-bold">{order.total_price} ₴</td>
                        <td className="p-4">
                           <select 
                              className="border rounded p-1 text-sm bg-white"
                              value={order.status || 'new'}
                              onChange={async (e) => {
                                await supabase.from('orders').update({ status: e.target.value }).eq('id', order.id);
                                fetchData();
                              }}
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

        {/* === PRODUCTS TAB === */}
{activeTab === "products" && (
  <div>
    <div className="flex justify-between items-center mb-6">
       <h1 className="text-3xl font-bold">Товари</h1>
       
       {/* НОВА КНОПКА СИНХРОНІЗАЦІЇ */}
       <button 
         onClick={async () => {
           if(!confirm("Запустити синхронізацію з Totobi? Це може зайняти час.")) return;
           alert("Синхронізація почалась у фоні. Зачекайте повідомлення.");
           try {
             const res = await fetch('/api/sync');
             const data = await res.json();
             if(data.success) {
               alert(data.message);
               window.location.reload(); // Оновити сторінку, щоб побачити нові товари
             } else {
               alert("Помилка: " + data.error);
             }
           } catch (e) { alert("Помилка з'єднання"); }
         }}
         className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-lg"
       >
         <Truck size={18} /> Синхронізувати з Totobi
       </button>
    </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex gap-4 items-start">
                  <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-4 text-gray-300" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.price} ₴</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditing(item, 'product')} className="text-blue-500"><Pencil size={18} /></button>
                    <button onClick={() => deleteItem('products', item.id)} className="text-red-500"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}