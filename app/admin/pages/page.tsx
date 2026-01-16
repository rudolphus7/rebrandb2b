"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Plus, FileText, Save, AlertCircle, LogIn, Edit2, X, Loader2, Globe } from "lucide-react";
import Link from 'next/link';

export default function AdminPromoPages() {
    const router = useRouter();
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        subtitle: "",
        content: "",
        image_url: ""
    });

    useEffect(() => {
        checkAuth();
        fetchPages();
    }, []);

    async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setIsAdmin(false);
        } else {
            setIsAdmin(true);
        }
    }

    async function fetchPages() {
        setLoading(true);
        const { data, error } = await supabase.from("promo_pages").select("*").order("created_at", { ascending: false });
        if (error) console.error("Error fetching pages:", error);
        setPages(data || []);
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!window.confirm("Видалити цю сторінку?")) return;
        const { error } = await supabase.from("promo_pages").delete().eq("id", id);
        if (error) alert("Помилка: " + error.message);
        else {
            fetchPages();
            if (editingId === id) resetForm();
        }
    }

    function handleEdit(page: any) {
        setEditingId(page.id);
        setFormData({
            title: page.title || "",
            slug: page.slug || "",
            subtitle: page.subtitle || "",
            content: page.content || "",
            image_url: page.image_url || ""
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function resetForm() {
        setEditingId(null);
        setFormData({ title: "", slug: "", subtitle: "", content: "", image_url: "" });
    }

    async function handleSave() {
        if (!formData.title || !formData.slug) return alert("Заголовок та Slug обов'язкові!");

        setIsSaving(true);
        let error;

        if (editingId) {
            const { error: updateError } = await supabase.from("promo_pages").update(formData).eq("id", editingId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from("promo_pages").insert([formData]);
            error = insertError;
        }

        setIsSaving(false);

        if (error) {
            alert("Помилка: " + error.message);
        } else {
            resetForm();
            fetchPages();
        }
    }

    // Auto-generate slug from title if empty
    function handleTitleChange(val: string) {
        setFormData(prev => ({
            ...prev,
            title: val,
            slug: !editingId && !prev.slug ? val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : prev.slug
        }));
    }

    if (!loading && !isAdmin) return <div className="text-center p-10">Доступ заборонено</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Промо Сторінки</h1>

            {/* ФОРМА */}
            <div className={`p-6 rounded-2xl border mb-8 transition-colors ${editingId ? "bg-blue-900/20 border-blue-500/50" : "bg-[#1a1a1a] border-white/5"}`}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    {editingId ? <><Edit2 size={20} /> Редагування сторінки</> : <><Plus size={20} /> Створити сторінку</>}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                        type="text" placeholder="Заголовок сторінки"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.title}
                        onChange={e => handleTitleChange(e.target.value)}
                    />
                    <input
                        type="text" placeholder="URL Slug (напр. winter-sale)"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.slug}
                        onChange={e => setFormData({ ...formData, slug: e.target.value })}
                    />
                    <input
                        type="text" placeholder="Підзаголовок (опціонально)"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.subtitle}
                        onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                    />
                    <input
                        type="text" placeholder="Головне зображення (URL)"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.image_url}
                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    />
                    <textarea
                        placeholder="HTML Вміст сторінки (або просто текст)"
                        className="bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none md:col-span-2 font-mono text-sm"
                        rows={10}
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                    />
                </div>

                <div className="flex gap-3">
                    <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {editingId ? "Зберегти" : "Створити"}
                    </button>
                    {editingId && (
                        <button onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2">
                            <X size={18} /> Скасувати
                        </button>
                    )}
                </div>
            </div>

            {/* СПИСОК */}
            <div className="space-y-4">
                {pages.map((page) => (
                    <div key={page.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0">
                                {page.image_url ? <img src={page.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-700"><FileText /></div>}
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg">{page.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded text-xs font-mono">/promo/{page.slug}</span>
                                    <span>{new Date(page.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={`/promo/${page.slug}`} target="_blank" className="p-2 text-gray-400 hover:text-white transition" title="Переглянути">
                                <Globe size={20} />
                            </Link>
                            <button onClick={() => handleEdit(page)} className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition" title="Редагувати">
                                <Edit2 size={20} />
                            </button>
                            <button onClick={() => handleDelete(page.id)} className="p-2 text-red-500 hover:bg-red-900/20 rounded-lg transition" title="Видалити">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}
                {pages.length === 0 && !loading && <div className="text-center text-gray-500 py-10">Сторінок ще немає</div>}
            </div>
        </div>
    );
}
