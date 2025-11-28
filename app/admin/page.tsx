"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Додаємо роутер
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Plus, Image as ImageIcon, Save, AlertCircle, LogIn } from "lucide-react";

export default function AdminBanners() {
  const router = useRouter();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Форма для нового банера
  const [newBanner, setNewBanner] = useState({
    title: "",
    subtitle: "",
    description: "",
    image_url: ""
  });

  useEffect(() => {
    checkAuth();
    fetchBanners();
  }, []);

  // Перевірка авторизації
  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // Якщо не залогінені - показуємо попередження або редірект
        console.warn("No active session found");
        setIsAdmin(false);
    } else {
        setIsAdmin(true);
    }
  }

  async function fetchBanners() {
    setLoading(true);
    const { data, error } = await supabase.from("banners").select("*").order("id", { ascending: true });
    if (error) console.error("Error fetching banners:", error);
    setBanners(data || []);
    setLoading(false);
  }

  async function handleDelete(id: number) {
    if (!isAdmin) return alert("Будь ласка, увійдіть в систему!");
    
    const confirm = window.confirm("Видалити цей банер?");
    if (!confirm) return;

    const { error } = await supabase.from("banners").delete().eq("id", id);
    
    if (error) {
        alert("Помилка видалення (403): Перевірте SQL Policies або перелогіньтесь.");
        console.error(error);
    } else {
        fetchBanners();
    }
  }

  async function handleAdd() {
    if (!isAdmin) return alert("Будь ласка, увійдіть в систему!");
    if (!newBanner.image_url) return alert("Додайте посилання на зображення!");
    
    const { error } = await supabase.from("banners").insert([newBanner]);

    if (error) {
        alert("Помилка додавання (403): Перевірте SQL Policies або перелогіньтесь.");
        console.error(error);
    } else {
        setNewBanner({ title: "", subtitle: "", description: "", image_url: "" }); 
        fetchBanners();
    }
  }

  // Якщо користувач не адмін, показуємо кнопку входу
  if (!loading && !isAdmin) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <AlertCircle size={48} className="text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Доступ заборонено</h2>
              <p className="text-gray-400 mb-6">Ви повинні бути авторизовані, щоб керувати контентом.</p>
              <button 
                onClick={() => router.push("/login?redirect=/admin/banners")} // Передбачаємо редірект
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2"
              >
                  <LogIn size={20} /> Увійти в систему
              </button>
          </div>
      )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Керування Банерами</h1>

      {/* ФОРМА ДОДАВАННЯ */}
      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5 mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={20}/> Додати новий слайд</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input 
                type="text" placeholder="Заголовок (напр. НОВА КОЛЕКЦІЯ)" 
                className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                value={newBanner.title}
                onChange={e => setNewBanner({...newBanner, title: e.target.value})}
            />
            <input 
                type="text" placeholder="Підзаголовок (напр. WINTER 2025)" 
                className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                value={newBanner.subtitle}
                onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})}
            />
            <input 
                type="text" placeholder="Посилання на картинку (URL)" 
                className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none md:col-span-2"
                value={newBanner.image_url}
                onChange={e => setNewBanner({...newBanner, image_url: e.target.value})}
            />
            <textarea 
                placeholder="Короткий опис" 
                className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none md:col-span-2"
                rows={2}
                value={newBanner.description}
                onChange={e => setNewBanner({...newBanner, description: e.target.value})}
            />
        </div>
        <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2">
            <Save size={18}/> Зберегти банер
        </button>
      </div>

      {/* СПИСОК БАНЕРІВ */}
      <div className="space-y-4">
        {loading ? <p>Завантаження...</p> : banners.length === 0 ? (
            <div className="text-center py-10 bg-[#1a1a1a] rounded-xl border border-white/5">
                <ImageIcon className="mx-auto mb-2 text-gray-600" size={48} />
                <p className="text-gray-500">Банерів поки немає. Додайте перший!</p>
            </div>
        ) : (
            banners.map((banner) => (
                <div key={banner.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-64 h-48 md:h-auto relative bg-black">
                        {banner.image_url ? (
                            <img src={banner.image_url} className="w-full h-full object-cover" alt="Banner preview" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500"><ImageIcon/></div>
                        )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center">
                        <h4 className="text-xl font-bold text-white">{banner.title || "Без заголовка"}</h4>
                        <p className="text-blue-400 font-bold mb-2">{banner.subtitle}</p>
                        <p className="text-gray-400 text-sm mb-4">{banner.description}</p>
                        <div className="text-xs text-gray-600 font-mono truncate max-w-md bg-black/30 p-1 rounded">{banner.image_url}</div>
                    </div>
                    <div className="p-6 flex items-center border-l border-white/5">
                        <button onClick={() => handleDelete(banner.id)} className="p-3 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition" title="Видалити">
                            <Trash2 size={20}/>
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}