'use client';

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Save, Loader2, Image as ImageIcon, CheckCircle, AlertTriangle, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProductData {
    id?: string;
    title: string;
    description: string;
    vendor_article: string;
    brand: string;
    base_price: number;
    old_price: number | null;
    image_url: string;
    category_id: string;
    code: string;
    is_manual_category?: boolean;
    is_manual_title?: boolean;
    label: string | null; // НОВЕ ПОЛЕ
}

interface Category {
    id: string;
    name: string;
    parent_id: string | null;
}

interface AdminProductFormProps {
    initialData?: ProductData;
    isNew: boolean;
}

const TABS = [
    { id: 'general', name: 'Загальні' },
    { id: 'seo', name: 'SEO' },
    { id: 'related', name: 'Схожі товари' },
    { id: 'params', name: 'Параметри товару' },
];

// Доступні лейбли
const LABELS = [
    { value: 'new', name: 'Новинка', color: 'bg-green-500', text: 'text-white' },
    { value: 'sale', name: 'Розпродаж (Sale)', color: 'bg-blue-500', text: 'text-white' },
    { value: 'promo', name: 'Акція (Hot)', color: 'bg-red-500', text: 'text-white' },
    { value: 'hit', name: 'Хіт продажу', color: 'bg-yellow-400', text: 'text-black' },
];

export default function AdminProductForm({ initialData, isNew }: AdminProductFormProps) {
    const router = useRouter();

    const [formData, setFormData] = useState<ProductData>(initialData || {
        title: '',
        description: '',
        vendor_article: '',
        brand: '',
        base_price: 0,
        old_price: null,
        image_url: '',
        category_id: '',
        code: '',
        is_manual_category: false,
        label: null
    });

    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [selectedParentId, setSelectedParentId] = useState<string>(''); // Стан для вибору батька

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState('general');

    // 1. Завантаження категорій
    useEffect(() => {
        async function fetchCategories() {
            const { data } = await supabase.from('categories').select('id, name, parent_id').order('name');
            if (data) {
                setAllCategories(data);

                // Якщо редагуємо товар, треба встановити правильного "Батька"
                if (!isNew && initialData?.category_id) {
                    const currentCat = data.find(c => c.id === initialData.category_id);
                    if (currentCat?.parent_id) {
                        setSelectedParentId(currentCat.parent_id); // Встановити батька
                    } else if (currentCat) {
                        setSelectedParentId(currentCat.id); // Це і є батько
                    }
                }
            }
        }
        fetchCategories();
    }, [isNew, initialData]);

    // Фільтруємо списки для селектів
    const parentCategories = useMemo(() => allCategories.filter(c => !c.parent_id), [allCategories]);
    const subCategories = useMemo(() => allCategories.filter(c => c.parent_id === selectedParentId), [allCategories, selectedParentId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: (type === 'number' || name.includes('price')) ? parseFloat(value) || 0 : value,
            };

            // Auto-set label logic
            if (name === 'old_price' || name === 'base_price') {
                const base = name === 'base_price' ? (parseFloat(value) || 0) : prev.base_price;
                const old = name === 'old_price' ? (parseFloat(value) || 0) : (prev.old_price || 0);

                // If discount exists and no label is set (or it was 'sale'), set to 'sale'
                if (old > base && (!prev.label || prev.label === 'sale')) {
                    newData.label = 'sale';
                }
                // Optional: Clear 'sale' if no discount?
                // Let's stick to "auto-set if discount", user can change it manually.
            }

            return newData;
        });
        setMessage(null);
    };

    // Обробка зміни Батьківської категорії
    const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const parentId = e.target.value;
        setSelectedParentId(parentId);
        // Скидаємо вибрану категорію товару, бо ми змінили батька
        // Або можна одразу ставити parentId, якщо товар можна класти в корінь
        setFormData(prev => ({ ...prev, category_id: '' }));
    };

    const handleLabelSelect = (value: string) => {
        // Якщо клікнули на вже вибраний - знімаємо вибір
        setFormData(prev => ({ ...prev, label: prev.label === value ? null : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (!formData.category_id) {
            setMessage({ text: "Будь ласка, оберіть кінцеву підкатегорію", type: 'error' });
            setLoading(false);
            return;
        }

        const dataToSave = {
            ...formData,
            base_price: parseFloat(formData.base_price.toFixed(2)),
            old_price: formData.old_price ? parseFloat(formData.old_price.toFixed(2)) : null,
            updated_at: new Date().toISOString(),
            is_manual_category: true,
            is_manual_title: true
        };

        let error: any;

        if (isNew) {
            const result = await supabase.from('products').insert([dataToSave]).select();
            error = result.error;
            if (!error) {
                setMessage({ text: "Товар успішно створено!", type: 'success' });
                router.push('/admin/products');
            }
        } else {
            const result = await supabase.from('products').update(dataToSave).eq('id', formData.id);
            error = result.error;
            if (!error) {
                setMessage({ text: "Товар успішно оновлено!", type: 'success' });
                router.refresh();
            }
        }

        if (error) setMessage({ text: `Помилка: ${error.message}`, type: 'error' });
        setLoading(false);
    };

    return (
        <div className="max-w-7xl mx-auto text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <Link href="/admin/products" className="flex items-center text-gray-400 hover:text-white transition">
                    <ArrowLeft size={18} /> До списку товарів
                </Link>
                <button
                    onClick={handleSubmit}
                    type="button"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    Зберегти
                </button>
            </div>

            <h1 className="text-3xl font-bold mb-4">
                {isNew ? "Створення товару" : `${formData.title}`}
            </h1>

            {/* Tabs */}
            <div className="flex border-b border-white/10 mb-6">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === tab.id ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">

                {/* ЛІВА КОЛОНКА */}
                <div className="flex-1 space-y-6">
                    {message && (
                        <div className={`p-3 rounded-lg font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'general' && (
                        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 space-y-6">

                            {/* Фото */}
                            <div className="flex gap-4 items-start border-b border-white/10 pb-6">
                                <div className="w-24 h-24 bg-black rounded-lg flex items-center justify-center relative overflow-hidden border border-white/20">
                                    {formData.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={formData.image_url} alt="Product" className="w-full h-full object-contain" />
                                    ) : (
                                        <ImageIcon size={30} className="text-gray-600" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold">Зображення</h4>
                                    <input type="url" name="image_url" value={formData.image_url} onChange={handleChange} placeholder="Посилання на фото..."
                                        className="w-full mt-2 p-2 text-sm bg-black border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white" />
                                </div>
                            </div>

                            <label className="block">
                                <span className="text-gray-400 text-sm block mb-1">Назва товару</span>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} required
                                    className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white" />
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-gray-400 text-sm block mb-1">Артикул (SKU)</span>
                                    <input type="text" name="vendor_article" value={formData.vendor_article} onChange={handleChange} required
                                        className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white" />
                                </label>
                                <label className="block">
                                    <span className="text-gray-400 text-sm block mb-1">Бренд</span>
                                    <input type="text" name="brand" value={formData.brand} onChange={handleChange}
                                        className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white" />
                                </label>
                            </div>

                            <label className="block">
                                <span className="text-gray-400 text-sm block mb-1">Опис</span>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows={5}
                                    className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none resize-none text-white"></textarea>
                            </label>

                            {/* --- ВИБІР КАТЕГОРІЇ (ДВОЕТАПНИЙ) --- */}
                            <div className="pt-4 border-t border-white/10">
                                <h4 className="font-bold mb-4 text-blue-400">КАТЕГОРІЯ</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 1. Батьківська категорія */}
                                    <label className="block">
                                        <span className="text-gray-400 text-sm block mb-1">1. Оберіть розділ</span>
                                        <select
                                            value={selectedParentId}
                                            onChange={handleParentChange}
                                            className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white cursor-pointer"
                                        >
                                            <option value="">-- Розділ --</option>
                                            {parentCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </label>

                                    {/* 2. Підкатегорія */}
                                    <label className="block">
                                        <span className="text-gray-400 text-sm block mb-1">2. Оберіть підкатегорію</span>
                                        <select
                                            name="category_id"
                                            value={formData.category_id}
                                            onChange={handleChange}
                                            disabled={!selectedParentId}
                                            className={`w-full p-3 border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white cursor-pointer ${!selectedParentId ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-black/50'}`}
                                        >
                                            <option value="">-- Підкатегорія --</option>
                                            {subCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                            {/* Дозволити обрати саму батьківську категорію, якщо підкатегорій немає */}
                                            {selectedParentId && subCategories.length === 0 && (
                                                <option value={selectedParentId}>
                                                    {parentCategories.find(c => c.id === selectedParentId)?.name} (Основна)
                                                </option>
                                            )}
                                        </select>
                                    </label>
                                </div>

                                {formData.is_manual_category && (
                                    <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                                        <CheckCircle size={12} /> Категорію зафіксовано вручну.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ПРАВА КОЛОНКА */}
                <div className="w-full lg:w-80 flex-shrink-0 space-y-6">

                    {/* ЦІНА */}
                    <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 space-y-4">
                        <h4 className="font-bold text-lg">Ціна</h4>
                        <label className="block">
                            <span className="text-gray-400 text-sm block mb-1">Ціна (грн)</span>
                            <input type="number" name="base_price" value={formData.base_price} onChange={handleChange} required step="1"
                                className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white font-bold text-lg" />
                        </label>
                        <label className="block">
                            <span className="text-gray-400 text-sm block mb-1">Стара ціна</span>
                            <input type="number" name="old_price" value={formData.old_price || ''} onChange={handleChange} step="1"
                                className="w-full p-3 bg-black/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none text-white" />
                        </label>
                    </div>

                    {/* ЛЕЙБЛИ (МАРКЕТИНГ) */}
                    <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 space-y-4">
                        <div className="flex items-center gap-2">
                            <Tag size={18} className="text-blue-400" />
                            <h4 className="font-bold text-lg">Маркетинг</h4>
                        </div>
                        <p className="text-xs text-gray-400">Оберіть мітку для товару:</p>

                        <div className="grid grid-cols-2 gap-2">
                            {LABELS.map(label => (
                                <button
                                    key={label.value}
                                    type="button"
                                    onClick={() => handleLabelSelect(label.value)}
                                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border-2 ${formData.label === label.value
                                            ? `${label.color} ${label.text} border-transparent scale-105 shadow-lg`
                                            : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'
                                        }`}
                                >
                                    {label.name}
                                </button>
                            ))}
                        </div>
                        {formData.label && (
                            <button type="button" onClick={() => handleLabelSelect(formData.label!)} className="text-xs text-red-400 hover:underline w-full text-center mt-2">
                                Зняти мітку
                            </button>
                        )}
                    </div>

                </div>
            </form>
        </div>
    );
}