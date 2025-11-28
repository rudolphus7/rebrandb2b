"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  Save, ArrowLeft, Image as ImageIcon, Trash2, 
  Settings, ChevronDown, CheckCircle
} from "lucide-react";
import Link from "next/link";

interface ProductFormProps {
  initialData?: any; 
  isNew?: boolean;
}

export default function AdminProductForm({ initialData, isNew = false }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]); // Стан для списку категорій
  
  // Основний стан форми
  const [formData, setFormData] = useState({
    title: "",
    sku: "",
    price: 0,
    amount: 0,
    description: "",
    category: "",
    category_id: "", // Додаємо ID категорії для точної прив'язки
    image_url: "",
    color: "",
    brand: "",
    isVisible: true,
  });

  // Завантаження категорій при старті
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('*').order('order', { ascending: true });
      if (data) setCategories(data);
    }
    fetchCategories();
  }, []);

  // Заповнюємо форму при редагуванні
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        sku: initialData.sku || "",
        price: initialData.price || 0,
        amount: initialData.amount || 0,
        description: initialData.description || "",
        category: initialData.category || "",
        category_id: initialData.category_external_id || "", // Важливо: беремо external_id
        image_url: initialData.image_url || "",
        color: initialData.color || "",
        brand: initialData.brand || "",
        isVisible: true,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  // Обробка вибору категорії зі списку
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedCategory = categories.find(c => c.id === selectedId);
    
    if (selectedCategory) {
      setFormData(prev => ({
        ...prev,
        category: selectedCategory.name, // Зберігаємо назву для відображення
        category_id: selectedCategory.id // Зберігаємо ID для зв'язку
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    const productPayload = {
      title: formData.title,
      sku: formData.sku,
      price: formData.price,
      amount: formData.amount,
      description: formData.description,
      category: formData.category,
      category_external_id: formData.category_id, // Записуємо ID в правильну колонку
      image_url: formData.image_url,
      color: formData.color,
      brand: formData.brand,
    };

    let error;

    if (isNew) {
      const { error: insertError } = await supabase.from('products').insert([productPayload]);
      error = insertError;
    } else {
      const { error: updateError } = await supabase
        .from('products')
        .update(productPayload)
        .eq('id', initialData.id);
      error = updateError;
    }

    setLoading(false);

    if (error) {
      alert(`Помилка: ${error.message}`);
    } else {
      router.push('/admin/products');
      router.refresh(); 
    }
  };

  const handleDelete = async () => {
    if (!confirm("Видалити цей товар безповоротно?")) return;
    
    const { error } = await supabase.from('products').delete().eq('id', initialData.id);
    if (error) {
        alert(error.message);
    } else {
        router.push('/admin/products');
    }
  };

  // Групуємо категорії для красивого списку (Батько -> Діти)
  const rootCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  return (
    <div className="max-w-6xl mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <Link href="/admin/products" className="p-2 bg-[#222] rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white">
                <ArrowLeft size={20}/>
            </Link>
            <div>
                <div className="text-xs text-gray-500 mb-1">Товари / {formData.category || "Новий"}</div>
                <h1 className="text-2xl font-bold text-white">
                    {isNew ? "Новий товар" : formData.title || "Без назви"}
                </h1>
            </div>
        </div>
        <div className="flex gap-3">
            {!isNew && (
                <button onClick={handleDelete} className="p-3 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition">
                    <Trash2 size={20}/>
                </button>
            )}
            <button 
                onClick={handleSave} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
            >
                <Save size={20}/> {loading ? "Збереження..." : "Зберегти"}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === LEFT COLUMN === */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* IMAGES & INFO */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <div className="flex gap-6 mb-6">
                    <div className="w-32 h-32 bg-black rounded-lg border border-white/10 flex items-center justify-center relative overflow-hidden group shrink-0">
                        {formData.image_url ? (
                            <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover"/>
                        ) : (
                            <ImageIcon size={32} className="text-gray-600"/>
                        )}
                    </div>
                    
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Назва товару</label>
                            <input 
                                type="text" name="title" 
                                className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-bold"
                                value={formData.title} onChange={handleChange}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Артикул (SKU)</label>
                                <input 
                                    type="text" name="sku" 
                                    className="w-full bg-[#222] border border-white/10 rounded-lg p-2 text-white focus:border-blue-500 outline-none text-sm font-mono"
                                    value={formData.sku} onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Посилання на фото</label>
                                <input 
                                    type="text" name="image_url" placeholder="https://..."
                                    className="w-full bg-[#222] border border-white/10 rounded-lg p-2 text-white focus:border-blue-500 outline-none text-sm text-blue-400"
                                    value={formData.image_url} onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Опис</label>
                    <textarea 
                        name="description"
                        rows={8}
                        className="w-full bg-[#222] border border-white/10 rounded-lg p-4 text-white outline-none resize-y text-sm leading-relaxed focus:border-blue-500"
                        value={formData.description} onChange={handleChange}
                    />
                </div>
            </div>

            {/* PARAMETERS */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Параметри</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Бренд</label>
                        <input 
                            type="text" name="brand"
                            className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            value={formData.brand} onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Колір</label>
                        <input 
                            type="text" name="color"
                            className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            value={formData.color} onChange={handleChange}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Категорія</label>
                        <div className="relative">
                            <select 
                                name="category_id"
                                className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white appearance-none outline-none focus:border-blue-500 cursor-pointer"
                                value={formData.category_id} 
                                onChange={handleCategoryChange}
                            >
                                <option value="">-- Оберіть категорію --</option>
                                {rootCategories.map(root => (
                                    <optgroup key={root.id} label={root.name}>
                                        <option value={root.id}>{root.name} (Головна)</option>
                                        {getChildren(root.id).map(child => (
                                            <option key={child.id} value={child.id}>&nbsp;&nbsp;&nbsp;↳ {child.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-4 text-gray-500 pointer-events-none"/>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        {/* === RIGHT COLUMN === */}
        <div className="space-y-6">
            
            {/* Status */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-gray-400">Видимість</span>
                    <Settings size={16} className="text-gray-600"/>
                </div>
                <div className="relative">
                    <select 
                        className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white appearance-none outline-none focus:border-blue-500 cursor-pointer"
                        value={formData.isVisible ? "public" : "draft"}
                        onChange={(e) => setFormData({...formData, isVisible: e.target.value === "public"})}
                    >
                        <option value="public">Опубліковано</option>
                        <option value="draft">Чернетка</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-4 text-gray-500 pointer-events-none"/>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-green-500 bg-green-900/10 p-2 rounded border border-green-900/30">
                    <CheckCircle size={14}/>
                    Товар видимий на сайті
                </div>
            </div>

            {/* Price */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ціна (ГРН)</label>
                <input 
                    type="number" name="price"
                    className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-bold text-xl"
                    value={formData.price} onChange={handleChange}
                />
            </div>

            {/* Stock */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Наявність</label>
                <div className="relative mb-4">
                    <select className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white appearance-none outline-none focus:border-blue-500">
                        <option value="in_stock">В наявності</option>
                        <option value="out_of_stock">Немає</option>
                        <option value="preorder">Під замовлення</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-4 text-gray-500 pointer-events-none"/>
                </div>
                
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Залишок (шт)</label>
                <input 
                    type="number" name="amount"
                    className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-mono"
                    value={formData.amount} onChange={handleChange}
                />
            </div>

        </div>
      </div>
    </div>
  );
}