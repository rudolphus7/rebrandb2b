"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Plus, Image as ImageIcon, Save, AlertCircle, LogIn, Edit2, X, Loader2 } from "lucide-react";

export default function AdminBanners() {
    const router = useRouter();
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // Новий стан для анімації збереження
    const [isAdmin, setIsAdmin] = useState(false);

    // Стан для редагування (ID банера, який зараз редагується)
    const [editingId, setEditingId] = useState<number | null>(null);

    // Форма
    const [formData, setFormData] = useState({
        title: "",
        subtitle: "",
        description: "",
        image_url: "",
        link: ""
    });

    useEffect(() => {
        checkAuth();
        fetchBanners();
    }, []);

    // Перевірка авторизації
    async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
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
            alert("Помилка видалення: " + error.message);
        } else {
            fetchBanners();
            if (editingId === id) resetForm();
        }
    }

    // Заповнити форму даними для редагування
    function handleEdit(banner: any) {
        setEditingId(banner.id);
        setFormData({
            title: banner.title || "",
            subtitle: banner.subtitle || "",
            description: banner.description || "",
            image_url: banner.image_url || "",
            link: banner.link || ""
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function resetForm() {
        setEditingId(null);
        setFormData({ title: "", subtitle: "", description: "", image_url: "", link: "" });
    }

    // Зберегти (Створити або Оновити)
    async function handleSave() {
        if (!isAdmin) return alert("Будь ласка, увійдіть в систему!");
        if (!formData.image_url) return alert("Додайте посилання на зображення!");

        setIsSaving(true); // Вмикаємо індикатор завантаження
        let error;

        if (editingId) {
            // ОНОВЛЕННЯ
            const { error: updateError } = await supabase
                .from("banners")
                .update(formData)
                .eq("id", editingId);
            error = updateError;
        } else {
            // СТВОРЕННЯ
            const { error: insertError } = await supabase
                .from("banners")
                .insert([formData]);
            error = insertError;
        }

        setIsSaving(false); // Вимикаємо індикатор

        if (error) {
            alert(`Помилка ${editingId ? "оновлення" : "додавання"}: ${error.message}`);
            console.error(error);
        } else {
            resetForm();
            fetchBanners();
        }
    }

    if (!loading && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Доступ заборонено</h2>
                <p className="text-gray-400 mb-6">Ви повинні бути авторизовані, щоб керувати контентом.</p>
                <button
                    onClick={() => router.push("/login?redirect=/admin/banners")}
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

            {/* ФОРМА (РЕДАГУВАННЯ / ДОДАВАННЯ) */}
            <div className={`p-6 rounded-2xl border mb-8 transition-colors ${editingId ? "bg-blue-900/20 border-blue-500/50" : "bg-[#1a1a1a] border-white/5"}`}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    {editingId ? <><Edit2 size={20} className="text-blue-400" /> Редагування банера #{editingId}</> : <><Plus size={20} /> Додати новий слайд</>}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                        type="text" placeholder="Заголовок (напр. НОВА КОЛЕКЦІЯ)"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                    <input
                        type="text" placeholder="Підзаголовок (напр. WINTER 2025)"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.subtitle}
                        onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                    />
                    <input
                        type="text" placeholder="Посилання на картинку (URL)"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.image_url}
                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    />
                    <input
                        type="text" placeholder="Посилання кнопки (приклад: /catalog/odyah)"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.link}
                        onChange={e => setFormData({ ...formData, link: e.target.value })}
                    />
                    <textarea
                        placeholder="Короткий опис"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none md:col-span-2"
                        rows={2}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {editingId ? "Зберегти зміни" : "Створити банер"}
                    </button>

                    {editingId && (
                        <button onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2">
                            <X size={18} /> Скасувати
                        </button>
                    )}
                </div>
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
                        <div key={banner.id} className={`bg-[#1a1a1a] border rounded-xl overflow-hidden flex flex-col md:flex-row transition ${editingId === banner.id ? "border-blue-500 ring-1 ring-blue-500" : "border-white/5"}`}>
                            <div className="w-full md:w-64 h-48 md:h-auto relative bg-black shrink-0">
                                {banner.image_url ? (
                                    <img src={banner.image_url} className="w-full h-full object-cover" alt="Banner preview" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500"><ImageIcon /></div>
                                )}
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-center min-w-0">
                                <h4 className="text-xl font-bold text-white truncate">{banner.title || "Без заголовка"}</h4>
                                <p className="text-blue-400 font-bold mb-2 truncate">{banner.subtitle}</p>
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{banner.description}</p>
                                <div className="flex flex-col gap-1">
                                    <div className="text-xs text-gray-600 font-mono truncate bg-black/30 p-1.5 rounded w-full flex items-center gap-2">
                                        <span className="text-gray-500 select-none">IMG:</span> {banner.image_url}
                                    </div>
                                    {banner.link && (
                                        <div className="text-xs text-green-600/70 font-mono truncate bg-green-900/10 p-1.5 rounded w-full flex items-center gap-2">
                                            <span className="text-green-500 select-none">LINK:</span> {banner.link}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 flex items-center gap-2 border-t md:border-t-0 md:border-l border-white/5 justify-end md:justify-center bg-[#151515]">
                                <button onClick={() => handleEdit(banner)} className="p-3 bg-blue-900/20 text-blue-400 rounded-lg hover:bg-blue-900/40 transition" title="Редагувати">
                                    <Edit2 size={20} />
                                </button>
                                <button onClick={() => handleDelete(banner.id)} className="p-3 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition" title="Видалити">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}