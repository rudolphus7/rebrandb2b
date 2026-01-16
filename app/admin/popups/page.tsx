"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    Trash2, Plus, Edit2, Save, X, Loader2, MessageSquare,
    Clock, Layout, Zap, Monitor, Eye, EyeOff, Smartphone, Monitor as MonitorIcon, CheckCircle, ArrowLeft, Image as ImageIcon
} from "lucide-react";
import Image from "next/image";

export default function AdminPopups() {
    const [popups, setPopups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Editor UI State
    const [activeTab, setActiveTab] = useState<'content' | 'targeting' | 'settings'>('content');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

    const [formData, setFormData] = useState({
        name: "",
        title: "",
        content: "",
        image_url: "",
        link_url: "",
        btn_text: "Детальніше",
        display_pages: "*",
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
    }

    function handleCreate() {
        setEditingId('new');
        setFormData({
            name: "", title: "Спеціальна пропозиція", content: "Отримайте знижку 10% на перше замовлення.", image_url: "",
            link_url: "", btn_text: "Отримати", display_pages: "*", exclude_pages: "",
            trigger_delay: 3, trigger_type: "timer", position: "center", frequency: "session", is_active: false
        });
    }

    function parseArrayToString(arr: string[] | null) {
        if (!arr || arr.length === 0) return "";
        return arr.join(", ");
    }

    function parseStringToArray(str: string) {
        if (!str.trim()) return [];
        return str.split(",").map(s => s.trim()).filter(Boolean);
    }

    async function handleSave() {
        if (!formData.name) return alert("Вкажіть внутрішню назву");
        setIsSaving(true);

        const payload = {
            ...formData,
            display_pages: parseStringToArray(formData.display_pages),
            exclude_pages: parseStringToArray(formData.exclude_pages)
        };

        let error;
        if (editingId && editingId !== 'new') {
            const { error: e } = await supabase.from("popups").update(payload).eq("id", editingId);
            error = e;
        } else {
            const { error: e } = await supabase.from("popups").insert([payload]);
            error = e;
        }

        setIsSaving(false);
        if (error) alert("Error: " + error.message);
        else {
            setEditingId(null);
            fetchPopups();
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Видалити цей попап?")) return;
        await supabase.from("popups").delete().eq("id", id);
        fetchPopups();
    }

    // --- RENDER ---

    if (editingId) {
        return (
            <div className="flex flex-col h-[calc(100vh-120px)]">
                {/* HEADER */}
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setEditingId(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold">{editingId === 'new' ? 'Створення поп-апу' : 'Редагування'}</h2>
                            <p className="text-xs text-gray-500">Налаштуйте вигляд та умови показу</p>
                        </div>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2">
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Зберегти
                    </button>
                </div>

                {/* MAIN CONTENT SPLIT */}
                <div className="flex-1 flex gap-6 overflow-hidden">

                    {/* LEFT: SETTINGS EDITOR */}
                    <div className="w-1/3 min-w-[350px] bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col overflow-hidden">

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-white/10">
                            <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'content' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}>Контент</button>
                            <button onClick={() => setActiveTab('targeting')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'targeting' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}>Правила</button>
                            <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'settings' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}>Налаштування</button>
                        </div>

                        {/* Form Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {activeTab === 'content' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Заголовок</label>
                                        <input type="text" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition"
                                            value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Текст (HTML)</label>
                                        <textarea className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition" rows={4}
                                            value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><ImageIcon size={14} /> Зображення (URL)</label>
                                        <input type="text" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition"
                                            value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-gray-500">Текст кнопки</label>
                                            <input type="text" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition"
                                                value={formData.btn_text} onChange={e => setFormData({ ...formData, btn_text: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-gray-500">Посилання</label>
                                            <input type="text" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition"
                                                value={formData.link_url} onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'targeting' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Де показувати (Include)</label>
                                        <input type="text" placeholder="*, /catalog" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 font-mono text-sm outline-none focus:border-blue-500 transition"
                                            value={formData.display_pages} onChange={e => setFormData({ ...formData, display_pages: e.target.value })}
                                        />
                                        <p className="text-[10px] text-gray-400">Використовуйте * для всіх сторінок</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Не показувати (Exclude)</label>
                                        <input type="text" placeholder="/login, /admin" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 font-mono text-sm outline-none focus:border-blue-500 transition"
                                            value={formData.exclude_pages} onChange={e => setFormData({ ...formData, exclude_pages: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Частота показу</label>
                                        <select className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none"
                                            value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                        >
                                            <option value="session">Раз на сесію (поки не закриє браузер)</option>
                                            <option value="once">Один раз назавжди</option>
                                            <option value="always">Завжди (Кожен раз)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {activeTab === 'settings' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Назва (Службова)</label>
                                        <input type="text" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition"
                                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Позиція</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button onClick={() => setFormData({ ...formData, position: 'center' })} className={`p-2 border rounded-lg text-xs font-bold ${formData.position === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'border-white/10 hover:bg-white/5'}`}>Center</button>
                                            <button onClick={() => setFormData({ ...formData, position: 'bottom_right' })} className={`p-2 border rounded-lg text-xs font-bold ${formData.position === 'bottom_right' ? 'bg-blue-600 text-white border-blue-600' : 'border-white/10 hover:bg-white/5'}`}>Bottom R</button>
                                            <button onClick={() => setFormData({ ...formData, position: 'bottom_left' })} className={`p-2 border rounded-lg text-xs font-bold ${formData.position === 'bottom_left' ? 'bg-blue-600 text-white border-blue-600' : 'border-white/10 hover:bg-white/5'}`}>Bottom L</button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Затримка (сек)</label>
                                        <input type="number" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition"
                                            value={formData.trigger_delay} onChange={e => setFormData({ ...formData, trigger_delay: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="pt-4 border-t border-white/10">
                                        <label className="flex items-center gap-3 cursor-pointer select-none bg-gray-900 p-4 rounded-xl border border-white/10">
                                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-700'}`} onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.is_active ? 'translate-x-6' : ''}`}></div>
                                            </div>
                                            <span className="font-bold text-white uppercase text-sm">Активний</span>
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: LIVE PREVIEW */}
                    <div className="flex-1 bg-gray-100 dark:bg-[#050505] rounded-3xl border border-gray-200 dark:border-white/5 shadow-inner flex flex-col relative overflow-hidden">

                        {/* Toolbar */}
                        <div className="h-14 bg-white dark:bg-[#111] border-b border-gray-200 dark:border-white/5 flex items-center justify-center gap-4">
                            <button onClick={() => setPreviewDevice('desktop')} className={`p-2 rounded-lg transition ${previewDevice === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                <MonitorIcon size={20} />
                            </button>
                            <button onClick={() => setPreviewDevice('mobile')} className={`p-2 rounded-lg transition ${previewDevice === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                <Smartphone size={20} />
                            </button>
                        </div>

                        {/* Canvas */}
                        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-100">
                            <div className={`relative bg-white dark:bg-black shadow-2xl transition-all duration-500 border border-gray-200 dark:border-white/10 overflow-hidden
                                ${previewDevice === 'mobile' ? 'w-[375px] h-[667px] rounded-3xl' : 'w-full h-full rounded-xl'}
                           `}>
                                {/* Mockup Interface Header */}
                                <div className="h-14 border-b border-gray-100 dark:border-white/10 flex items-center px-4 justify-between bg-white dark:bg-[#0a0a0a]">
                                    <div className="w-24 h-4 bg-gray-200 dark:bg-white/10 rounded"></div>
                                    <div className="flex gap-2">
                                        <div className="w-8 h-8 bg-gray-100 dark:bg-white/5 rounded-full"></div>
                                        <div className="w-8 h-8 bg-gray-100 dark:bg-white/5 rounded-full"></div>
                                    </div>
                                </div>

                                {/* Mockup Content */}
                                <div className="p-4 space-y-4 opacity-20 pointer-events-none">
                                    <div className="h-40 bg-gray-100 dark:bg-white/5 rounded-xl w-full"></div>
                                    <div className="flex gap-4">
                                        <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl flex-1"></div>
                                        <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl flex-1"></div>
                                    </div>
                                </div>

                                {/* --- THE POPUP PREVIEW --- */}
                                <div className={`absolute inset-0 z-50 pointer-events-none flex p-4
                                    ${formData.position === 'center' ? 'items-center justify-center bg-black/50 backdrop-blur-sm' : ''}
                                    ${formData.position === 'bottom_right' ? 'items-end justify-end' : ''}
                                    ${formData.position === 'bottom_left' ? 'items-end justify-start' : ''}
                               `}>

                                    <div className={`bg-white dark:bg-[#111] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden flex flex-col pointer-events-auto
                                        ${formData.position !== 'center' ? 'mb-4 mx-2' : ''}
                                   `}>
                                        <div className="absolute top-3 right-3 p-1.5 bg-black/10 dark:bg-white/10 rounded-full text-black dark:text-white">
                                            <X size={16} />
                                        </div>

                                        {formData.image_url ? (
                                            <div className={`relative w-full bg-gray-200 ${formData.position === 'center' ? 'h-48' : 'h-32'}`}>
                                                {/* Use regular img for preview to handle external links */}
                                                <img src={formData.image_url} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="h-4 bg-gray-100 dark:bg-white/5"></div>
                                        )}

                                        <div className="p-6">
                                            <h3 className="text-xl font-bold mb-2 text-black dark:text-white leading-tight">{formData.title || "Заголовок"}</h3>
                                            <p className="text-gray-500 text-sm mb-6" dangerouslySetInnerHTML={{ __html: formData.content || "Текст вашого повідомлення..." }}></p>
                                            <div className="w-full bg-blue-600 text-white font-bold text-center py-3 rounded-xl">
                                                {formData.btn_text || "Кнопка"}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // --- LIST VIEW ---
    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Усі Поп-апи</h1>
                <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition">
                    <Plus size={20} /> Створити новий
                </button>
            </div>

            {loading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {popups.map(p => (
                        <div key={p.id} onClick={() => handleEdit(p)} className="cursor-pointer group bg-[#111] border border-white/5 hover:border-blue-500/50 hover:bg-blue-900/5 rounded-2xl overflow-hidden transition relative">
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                                    {p.is_active ? 'Active' : 'Draft'}
                                </span>
                            </div>
                            <div className="p-6 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">{p.name}</h3>
                                </div>
                                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{p.title}</p>

                                <div className="mt-auto flex gap-2 text-xs text-gray-500 font-mono">
                                    <span className="bg-white/5 px-2 py-1 rounded">{p.position}</span>
                                    <span className="bg-white/5 px-2 py-1 rounded">{p.trigger_delay}s</span>
                                </div>

                                <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }} className="p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
