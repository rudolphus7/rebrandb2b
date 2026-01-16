"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    Trash2, Plus, Edit2, Save, X, Loader2, MessageSquare,
    Clock, Layout, Zap, Monitor, Eye, EyeOff
} from "lucide-react";

export default function AdminPopups() {
    const router = useRouter();
    const [popups, setPopups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        title: "",
        content: "",
        image_url: "",
        link_url: "",
        btn_text: "Детальніше",
        display_pages: "*", // We'll convert string <-> array
        exclude_pages: "",
        trigger_delay: 3,
        trigger_type: "timer",
        position: "center",
        frequency: "session",
        is_active: false
    });

    useEffect(() => {
        fetchPopups();
    }, []);

    async function fetchPopups() {
        setLoading(true);
        const { data } = await supabase.from("popups").select("*").order("created_at", { ascending: false });
        setPopups(data || []);
        setLoading(false);
    }

    // Handle Form Data Formatting
    function parseArrayToString(arr: string[] | null) {
        if (!arr || arr.length === 0) return "";
        return arr.join(", ");
    }

    function parseStringToArray(str: string) {
        if (!str.trim()) return [];
        return str.split(",").map(s => s.trim()).filter(Boolean);
    }

    function handleEdit(item: any) {
        setEditingId(item.id);
        setFormData({
            name: item.name || "",
            title: item.title || "",
            content: item.content || "",
            image_url: item.image_url || "",
            link_url: item.link_url || "",
            btn_text: item.btn_text || "Детальніше",
            display_pages: parseArrayToString(item.display_pages),
            exclude_pages: parseArrayToString(item.exclude_pages),
            trigger_delay: item.trigger_delay || 3,
            trigger_type: item.trigger_type || "timer",
            position: item.position || "center",
            frequency: item.frequency || "session",
            is_active: item.is_active || false
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function resetForm() {
        setEditingId(null);
        setFormData({
            name: "", title: "", content: "", image_url: "", link_url: "", btn_text: "Детальніше",
            display_pages: "*", exclude_pages: "", trigger_delay: 3, trigger_type: "timer",
            position: "center", frequency: "session", is_active: false
        });
    }

    async function handleSave() {
        if (!formData.name) return alert("Вкажіть внутрішню назву для списку");

        setIsSaving(true);

        const payload = {
            ...formData,
            display_pages: parseStringToArray(formData.display_pages),
            exclude_pages: parseStringToArray(formData.exclude_pages)
        };

        let error;
        if (editingId) {
            const { error: e } = await supabase.from("popups").update(payload).eq("id", editingId);
            error = e;
        } else {
            const { error: e } = await supabase.from("popups").insert([payload]);
            error = e;
        }

        setIsSaving(false);
        if (error) alert("Error: " + error.message);
        else {
            resetForm();
            fetchPopups();
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this popup?")) return;
        await supabase.from("popups").delete().eq("id", id);
        fetchPopups();
    }

    async function toggleActive(id: string, current: boolean) {
        await supabase.from("popups").update({ is_active: !current }).eq("id", id);
        fetchPopups();
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Керування Поп-апами</h1>

            {/* EDITOR */}
            <div className={`p-6 rounded-2xl border mb-8 transition-colors ${editingId ? "bg-blue-900/20 border-blue-500/50" : "bg-[#1a1a1a] border-white/5"}`}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    {editingId ? <><Edit2 size={20} /> Редагування</> : <><Plus size={20} /> Новий попап</>}
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left: General Info */}
                    <div className="space-y-4">
                        <h4 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-2">Основна інформація</h4>
                        <input
                            type="text" placeholder="Назва (для адмінки, напр. 'Знижка Весна')"
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <input
                            type="text" placeholder="Заголовок попапу (напр. 'Ваш промокод!')"
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                        <textarea
                            placeholder="Текст повідомлення (можна HTML)"
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            rows={3}
                            value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })}
                        />
                        <input
                            type="text" placeholder="Картинка URL (опціонально)"
                            className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                        />
                    </div>

                    {/* Right: Settings */}
                    <div className="space-y-6">
                        {/* Action */}
                        <div>
                            <h4 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-3">Дія (Кнопка)</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text" placeholder="Посилання (URL)"
                                    className="bg-black border border-white/10 rounded-lg p-3 text-white"
                                    value={formData.link_url} onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                                />
                                <input
                                    type="text" placeholder="Текст кнопки"
                                    className="bg-black border border-white/10 rounded-lg p-3 text-white"
                                    value={formData.btn_text} onChange={e => setFormData({ ...formData, btn_text: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Targeting */}
                        <div>
                            <h4 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-3 flex items-center gap-2"><Monitor size={14} /> Де показувати?</h4>
                            <div className="gap-2 grid">
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-xs text-gray-500">Include:</span>
                                    <input
                                        type="text" placeholder="*, /catalog, /promo/winter"
                                        className="w-full bg-black border border-white/10 rounded-lg p-3 pl-16 text-white text-sm font-mono"
                                        value={formData.display_pages} onChange={e => setFormData({ ...formData, display_pages: e.target.value })}
                                    />
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-xs text-red-500/50">Exclude:</span>
                                    <input
                                        type="text" placeholder="/login, /admin"
                                        className="w-full bg-black border border-white/10 rounded-lg p-3 pl-16 text-white text-sm font-mono"
                                        value={formData.exclude_pages} onChange={e => setFormData({ ...formData, exclude_pages: e.target.value })}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500">* - означає всі сторінки. Розділяйте комою.</p>
                            </div>
                        </div>

                        {/* Behavior */}
                        <div>
                            <h4 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-3 flex items-center gap-2"><Layout size={14} /> Поведінка та Вигляд</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    className="bg-black border border-white/10 rounded-lg p-3 text-white outline-none"
                                    value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}
                                >
                                    <option value="center">По центру (Modal)</option>
                                    <option value="bottom_right">Знизу справа (Toast)</option>
                                    <option value="bottom_left">Знизу зліва</option>
                                </select>

                                <div className="flex items-center gap-2 bg-black border border-white/10 rounded-lg p-3">
                                    <Clock size={16} className="text-gray-500" />
                                    <input
                                        type="number"
                                        className="bg-transparent text-white w-full outline-none"
                                        placeholder="Сек. затримка"
                                        value={formData.trigger_delay} onChange={e => setFormData({ ...formData, trigger_delay: parseInt(e.target.value) })}
                                    />
                                    <span className="text-xs text-gray-500">сек</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Toggle in Form */}
                        <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-700'}`} onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.is_active ? 'translate-x-6' : ''}`}></div>
                                </div>
                                <span className="font-bold text-white">{formData.is_active ? "Активний" : "Вимкнений"}</span>
                            </label>
                        </div>

                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 mt-8">
                    <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {editingId ? "Зберегти зміни" : "Створити Поп-ап"}
                    </button>
                    {editingId && (
                        <button onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2">
                            <X size={18} /> Скасувати
                        </button>
                    )}
                </div>
            </div>

            {/* LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {popups.map(p => (
                    <div key={p.id} className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden flex flex-col transition relative group ${!p.is_active ? 'opacity-60 grayscale hover:grayscale-0' : ''} ${editingId === p.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-white/5'}`}>

                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 z-10">
                            <button onClick={() => toggleActive(p.id, p.is_active)} className={`p-1.5 rounded-full ${p.is_active ? 'bg-green-500 text-black' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}>
                                {p.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                        </div>

                        <div className="p-6 flex-1">
                            <div className="flex items-start justify-between mb-4">
                                <h4 className="font-bold text-xl text-white line-clamp-1">{p.name}</h4>
                            </div>
                            <p className="text-sm text-gray-400 mb-4 line-clamp-2 h-10">{p.title || "No title"}</p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="text-[10px] font-mono bg-blue-900/20 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
                                    {p.position === 'center' ? 'MODAL' : 'TOAST'}
                                </span>
                                <span className="text-[10px] font-mono bg-white/5 text-gray-400 px-2 py-1 rounded border border-white/10">
                                    {p.trigger_delay}s delay
                                </span>
                            </div>

                            <div className="text-[10px] text-gray-500 bg-black p-2 rounded w-full truncate font-mono">
                                ON: {parseArrayToString(p.display_pages)}
                            </div>
                        </div>

                        <div className="bg-[#111] p-4 flex gap-2 border-t border-white/5">
                            <button onClick={() => handleEdit(p)} className="flex-1 py-2 bg-white/5 hover:bg-blue-600 hover:text-white rounded-lg transition text-sm font-bold text-gray-400">
                                Редагувати
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
