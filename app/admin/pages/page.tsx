"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    Trash2, Plus, FileText, Save, AlertCircle, LogIn, Edit2, X, Loader2, Globe,
    Layout, Image as ImageIcon, Type, Monitor as MonitorIcon, Smartphone, ArrowLeft
} from "lucide-react";
import Link from 'next/link';
import IsolatedContent from "@/components/IsolatedContent";

export default function AdminCMSPages() {
    const router = useRouter();
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Editor State
    const [activeTab, setActiveTab] = useState<'general' | 'visuals' | 'content'>('general');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        subtitle: "",
        content: "",
        image_url: ""
    });

    useEffect(() => {
        fetchPages();
    }, []);

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
        else fetchPages();
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
    }

    function handleCreate() {
        setEditingId('new');
        setFormData({ title: "", slug: "", subtitle: "", content: "<h2>Ласкаво просимо!</h2><p>Це текст вашої нової промо-сторінки.</p>", image_url: "" });
    }

    function handleTitleChange(val: string) {
        setFormData(prev => ({
            ...prev,
            title: val,
            slug: !editingId || editingId === 'new' ? val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : prev.slug
        }));
    }

    async function handleSave() {
        if (!formData.title || !formData.slug) return alert("Заголовок та Slug обов'язкові!");
        setIsSaving(true);

        const payload = formData;
        let error;

        if (editingId && editingId !== 'new') {
            const { error: e } = await supabase.from("promo_pages").update(payload).eq("id", editingId);
            error = e;
        } else {
            const { error: e } = await supabase.from("promo_pages").insert([payload]);
            error = e;
        }

        setIsSaving(false);
        if (error) alert("Помилка: " + error.message);
        else {
            setEditingId(null);
            fetchPages();
        }
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
                            <h2 className="text-xl font-bold">{editingId === 'new' ? 'Створення Landing Page' : 'Редагування сторінки'}</h2>
                            <p className="text-xs text-gray-500">Створіть унікальну сторінку для вашої події</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {editingId !== 'new' && (
                            <Link href={`/${formData.slug}`} target="_blank" className="text-sm font-bold text-blue-500 hover:underline flex items-center gap-1">
                                <Globe size={14} /> Відкрити на сайті
                            </Link>
                        )}
                        <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2">
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Зберегти
                        </button>
                    </div>
                </div>

                {/* MAIN SPLIT */}
                <div className="flex-1 flex gap-6 overflow-hidden">

                    {/* LEFT: EDITOR */}
                    <div className="w-1/3 min-w-[380px] bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-lg">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
                            <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-xs font-bold uppercase transition border-b-2 ${activeTab === 'general' ? 'border-blue-500 text-blue-500 bg-white dark:bg-[#111]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <Layout size={14} className="inline mr-1 mb-0.5" /> Основне
                            </button>
                            <button onClick={() => setActiveTab('visuals')} className={`flex-1 py-3 text-xs font-bold uppercase transition border-b-2 ${activeTab === 'visuals' ? 'border-blue-500 text-blue-500 bg-white dark:bg-[#111]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <ImageIcon size={14} className="inline mr-1 mb-0.5" /> Банер
                            </button>
                            <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 text-xs font-bold uppercase transition border-b-2 ${activeTab === 'content' ? 'border-blue-500 text-blue-500 bg-white dark:bg-[#111]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <Type size={14} className="inline mr-1 mb-0.5" /> Контент
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {activeTab === 'general' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Заголовок H1</label>
                                        <input type="text" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 text-lg font-bold outline-none focus:border-blue-500 transition"
                                            value={formData.title} onChange={e => handleTitleChange(e.target.value)} placeholder="Summer Sale 2025"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Slug (URL адреса)</label>
                                        <div className="flex items-center">
                                            <span className="bg-gray-100 dark:bg-white/5 border border-r-0 border-gray-200 dark:border-white/10 p-3 rounded-l-lg text-gray-500 text-sm">/</span>
                                            <input type="text" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-r-lg p-3 outline-none focus:border-blue-500 transition font-mono text-sm"
                                                value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                                placeholder="referal/promo-winter"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Підзаголовок</label>
                                        <input type="text" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition"
                                            value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Знижки до -50%"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'visuals' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-gray-500">Головний банер (URL)</label>
                                        <input type="text" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 transition text-sm"
                                            value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..."
                                        />
                                    </div>
                                    {formData.image_url && (
                                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 aspect-video relative">
                                            <img src={formData.image_url} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-400">Рекомендований розмір: 1920x800px. Якщо залишити пустим, буде відображено тільки текстовий заголовок.</p>
                                </>
                            )}

                            {activeTab === 'content' && (
                                <div className="h-full flex flex-col">
                                    <label className="text-xs font-bold uppercase text-gray-500 mb-2">HTML Контент</label>
                                    <textarea className="flex-1 w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg p-4 outline-none focus:border-blue-500 transition font-mono text-sm leading-relaxed resize-none"
                                        value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="<p>Ваш текст...</p>"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: PREVIEW */}
                    <div className="flex-1 bg-gray-100 dark:bg-[#050505] rounded-3xl border border-gray-200 dark:border-white/5 shadow-inner flex flex-col relative overflow-hidden">

                        {/* Toolbar */}
                        <div className="h-14 bg-white dark:bg-[#111] border-b border-gray-200 dark:border-white/5 flex items-center justify-center gap-4 z-10 relative">
                            <span className="text-xs font-bold uppercase text-gray-400 absolute left-6">Live Preview</span>
                            <button onClick={() => setPreviewDevice('desktop')} className={`p-2 rounded-lg transition ${previewDevice === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                <MonitorIcon size={20} />
                            </button>
                            <button onClick={() => setPreviewDevice('mobile')} className={`p-2 rounded-lg transition ${previewDevice === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                <Smartphone size={20} />
                            </button>
                        </div>

                        {/* Canvass Wrapper */}
                        <div className="flex-1 overflow-auto p-8 flex justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-100">

                            {/* SIMULATED BROWSER WINDOW */}
                            <div className={`bg-white dark:bg-[#0a0a0a] shadow-2xl transition-all duration-500 flex flex-col overflow-hidden border border-gray-300 dark:border-gray-800
                                 ${previewDevice === 'mobile' ? 'w-[375px] h-[750px] rounded-[3rem] border-8 border-gray-900' : 'w-full h-full rounded-xl'} // Phone frame styling
                             `}>
                                {/* Fake Browser Headers (Desktop only) */}
                                {previewDevice === 'desktop' && (
                                    <div className="h-8 bg-gray-100 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-white/5 flex items-center px-4 gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                        <div className="ml-4 flex-1 bg-white dark:bg-black/20 h-5 rounded text-[10px] flex items-center px-2 text-gray-400 font-mono">
                                            myshop.com/{formData.slug || '...'}
                                        </div>
                                    </div>
                                )}

                                {/* PAGE CONTENT PREVIEW */}
                                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                                    <div className="min-h-full pb-20">
                                        {/* Nav Stub */}
                                        <div className="px-4 py-6 flex justify-between items-center opacity-50">
                                            <div className="font-bold text-lg">MYSHOP</div>
                                            <div className="w-6 h-6 bg-gray-200 dark:bg-white/10 rounded"></div>
                                        </div>

                                        <div className="container mx-auto px-4">

                                            {/* HERO PREVIEW */}
                                            <header className="mb-8 text-center">
                                                {formData.image_url ? (
                                                    <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden mb-6 shadow-xl bg-gray-100 dark:bg-white/5">
                                                        <img src={formData.image_url} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-left">
                                                            {formData.subtitle && <div className="text-blue-400 font-bold uppercase tracking-widest mb-1 text-xs md:text-sm">{formData.subtitle}</div>}
                                                            <h1 className="text-3xl md:text-5xl font-black text-white uppercase leading-none drop-shadow-md">{formData.title || "Заголовок"}</h1>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mb-8 border-b border-gray-100 dark:border-white/10 pb-8 text-left">
                                                        <h1 className="text-4xl md:text-5xl font-black mb-2 uppercase">{formData.title || "Заголовок"}</h1>
                                                        {formData.subtitle && <p className="text-lg text-gray-500">{formData.subtitle}</p>}
                                                    </div>
                                                )}
                                            </header>

                                            {/* BODY CONTENT PREVIEW */}
                                            <div className="px-4 pb-20">
                                                <IsolatedContent
                                                    content={formData.content || '<p class="text-gray-400 italic">Тут буде ваш контент...</p>'}
                                                    className="w-full"
                                                />
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Сторінки</h1>
                <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition">
                    <Plus size={20} /> Створити сторінку
                </button>
            </div>

            {loading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pages.map((page) => (
                        <div key={page.id} onClick={() => handleEdit(page)} className="group cursor-pointer bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full">
                            {/* Thumb */}
                            <div className="h-40 bg-gray-100 dark:bg-black relative overflow-hidden">
                                {page.image_url ? (
                                    <img src={page.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-white/10">
                                        <FileText size={48} />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(page.id) }} className="bg-white text-red-500 p-2 rounded-lg shadow-lg hover:bg-red-50">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="font-bold text-lg mb-1 leading-tight group-hover:text-blue-500 transition">{page.title}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{page.subtitle || "Без підзаголовку"}</p>

                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                    <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded truncate max-w-[150px]">
                                        /{page.slug}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(page.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {pages.length === 0 && (
                        <div className="col-span-full text-center py-20 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Plus size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Створіть першу сторінку</h3>
                            <p className="text-gray-500">Використовуйте цей інструмент для лендінгів та акцій</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
