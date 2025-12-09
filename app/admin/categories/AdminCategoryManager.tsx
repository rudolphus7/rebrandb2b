'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
    Plus, 
    Trash2, 
    Edit2, 
    ChevronDown, 
    ChevronRight, 
    Loader2, 
    X, 
    Save 
} from 'lucide-react';
import { useRouter } from "next/navigation";

interface Category {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    match_keywords: string[];
    children?: Category[];
}

interface CategoryFormState {
    name: string;
    slug: string;
    match_keywords: string;
    parent_id: string | null;
}

export function AdminCategoryManager() {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [parentCategory, setParentCategory] = useState<string | null>(null);
    const [formState, setFormState] = useState<CategoryFormState>({
        name: '',
        slug: '',
        match_keywords: '',
        parent_id: null,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    
    // --- ЗАВАНТАЖЕННЯ ДАНИХ ---
    const fetchCategories = useCallback(async () => {
        setLoading(true);
        // Додаємо випадковий параметр, щоб уникнути кешування браузером
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error("Error fetching categories:", error);
        } else {
            const categoryMap = new Map<string, Category>();
            const roots: Category[] = [];

            // Створюємо мапу всіх категорій
            (data || []).forEach(cat => {
                categoryMap.set(cat.id, { ...cat, children: [] });
            });

            // Будуємо дерево
            (data || []).forEach(cat => {
                const category = categoryMap.get(cat.id)!;
                if (cat.parent_id) {
                    const parent = categoryMap.get(cat.parent_id);
                    if (parent) {
                        parent.children!.push(category);
                    } else {
                        roots.push(category); // Якщо батька не знайдено (рідкісний кейс)
                    }
                } else {
                    roots.push(category);
                }
            });
            
            // Сортуємо roots за алфавітом
            roots.sort((a, b) => a.name.localeCompare(b.name));
            
            setCategories(roots);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);
    
    // --- ОБРОБНИКИ ПОДІЙ ---
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
        
        if (name === 'name') {
            const newSlug = value.toLowerCase()
                .replace(/і/g, 'i').replace(/ї/g, 'yi').replace(/є/g, 'ye').replace(/ґ/g, 'g')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-');
            setFormState(prev => ({ ...prev, slug: newSlug }));
        }
    };

    const handleCreateNew = (parentId: string | null) => {
        setEditingCategory(null);
        setParentCategory(parentId);
        setFormState({
            name: '',
            slug: '',
            match_keywords: '',
            parent_id: parentId,
        });
        setIsFormOpen(true);
    };

    const handleEdit = (cat: Category) => {
        setEditingCategory(cat);
        setFormState({
            name: cat.name,
            slug: cat.slug,
            match_keywords: cat.match_keywords?.join(', ') || '',
            parent_id: cat.parent_id,
        });
        setIsFormOpen(true);
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const dataToSave = {
            ...formState,
            match_keywords: formState.match_keywords.split(',').map(k => k.trim()).filter(k => k.length > 0),
            parent_id: formState.parent_id,
        };

        let result;
        if (editingCategory) {
            result = await supabase.from('categories').update(dataToSave).eq('id', editingCategory.id);
        } else {
            result = await supabase.from('categories').insert([dataToSave]);
        }

        if (result.error) {
            alert("Помилка збереження: " + result.error.message);
        } else {
            setIsFormOpen(false);
            setEditingCategory(null);
            await fetchCategories(); // Оновлюємо локальний стейт
            router.refresh(); // Оновлюємо кеш Next.js (важливо для Хедера/Сайдбара!)
        }
        setIsSaving(false);
    };
    
    const handleDelete = async (id: string) => {
        if (!confirm("Ви впевнені? Видалити категорію та всі її підкатегорії?")) return;
        
        const { error } = await supabase.from('categories').delete().eq('id', id);
        
        if (error) {
            alert("Помилка видалення: " + error.message);
        } else {
            await fetchCategories();
            router.refresh(); // Оновлюємо кеш Next.js
        }
    };
    
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // --- РЕНДЕРИНГ ФОРМИ ---
    const renderForm = () => (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setIsFormOpen(false)}>
            <div className="bg-[#1a1a1a] rounded-xl w-full max-w-lg shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
                <form onSubmit={handleSave} className="p-8 space-y-5">
                    <h2 className="text-xl font-bold border-b border-white/10 pb-3 mb-4 text-white">
                        {editingCategory ? "Редагування категорії" : (parentCategory ? "Створення підкатегорії" : "Створення головної категорії")}
                    </h2>

                    {parentCategory && (
                        <p className="text-sm text-gray-400">
                            Батьківська категорія: <span className="text-white font-bold">{categories.find(c => c.id === parentCategory)?.name || '...'}</span>
                        </p>
                    )}

                    <label className="block">
                        <span className="text-gray-400">Назва *</span>
                        <input type="text" name="name" value={formState.name} onChange={handleFormChange} required
                               className="w-full mt-1 p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white"/>
                    </label>
                    
                    <label className="block">
                        <span className="text-gray-400">Slug (URL) *</span>
                        <input type="text" name="slug" value={formState.slug} onChange={handleFormChange} required
                               className="w-full mt-1 p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white"/>
                    </label>

                    <label className="block">
                        <span className="text-gray-400">Ключові слова (через кому)</span>
                        <textarea name="match_keywords" value={formState.match_keywords} onChange={handleFormChange} rows={3}
                                  className="w-full mt-1 p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none resize-none text-white"/>
                        <p className="text-xs text-gray-500 mt-1">Для авто-сортування товарів (напр: футболка, t-shirt)</p>
                    </label>

                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>}
                        {editingCategory ? "Зберегти зміни" : "Створити"}
                    </button>
                </form>
            </div>
        </div>
    );

    // --- РЕНДЕРИНГ ДЕРЕВА ---
    const renderCategoryTree = (nodes: Category[], level: number = 0) => (
        <ul className={`space-y-1 ${level > 0 ? 'ml-6 border-l border-white/10 pl-2' : ''}`}>
            {nodes.map(cat => {
                const isExpanded = expandedIds.includes(cat.id);
                const hasChildren = cat.children && cat.children.length > 0;
                
                return (
                    <li key={cat.id} className={`${level === 0 ? 'bg-[#222] rounded-lg mb-2 overflow-hidden' : ''}`}>
                        <div className={`flex items-center justify-between p-3 hover:bg-white/5 transition-colors ${level === 0 ? 'font-bold' : 'text-sm text-gray-300'}`}>
                            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleExpand(cat.id)}>
                                {hasChildren ? (
                                    isExpanded ? <ChevronDown size={16} className="text-gray-500"/> : <ChevronRight size={16} className="text-gray-500"/>
                                ) : (
                                    <span className="w-4 h-4 block"></span>
                                )}
                                <span>{cat.name}</span>
                                <span className="text-xs text-gray-600 font-mono ml-2">/{cat.slug}</span>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                                <button onClick={() => handleCreateNew(cat.id)} title="Додати підкатегорію" className="hover:text-green-400 hover:bg-green-900/30 p-1.5 rounded transition">
                                    <Plus size={16}/>
                                </button>
                                <button onClick={() => handleEdit(cat)} title="Редагувати" className="hover:text-blue-400 hover:bg-blue-900/30 p-1.5 rounded transition">
                                    <Edit2 size={16}/>
                                </button>
                                <button onClick={() => handleDelete(cat.id)} title="Видалити" className="hover:text-red-400 hover:bg-red-900/30 p-1.5 rounded transition">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>
                        
                        {isExpanded && hasChildren && (
                            <div className="pb-2 pr-2">
                                {renderCategoryTree(cat.children!, level + 1)}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );

    return (
        <div className="min-h-screen p-8 text-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Категорії</h1>
                    <p className="text-gray-400 text-sm mt-1">Структура каталогу та правила сортування</p>
                </div>
                <button 
                    onClick={() => handleCreateNew(null)} 
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition shadow-lg shadow-green-900/20"
                >
                    <Plus size={20}/> Додати категорію
                </button>
            </div>

            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-xl">
                {loading ? (
                    <div className="text-center py-20 text-gray-400 flex flex-col items-center justify-center gap-4">
                         <Loader2 size={32} className="animate-spin text-blue-500"/> 
                         <span>Завантаження структури...</span>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/10 rounded-xl">
                        <p className="text-lg font-bold mb-2">Категорій ще немає</p>
                        <p className="text-sm">Створіть першу категорію, щоб почати роботу.</p>
                    </div>
                ) : (
                    renderCategoryTree(categories)
                )}
            </div>
            
            {isFormOpen && renderForm()}
        </div>
    );
}