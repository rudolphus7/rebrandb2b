"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  FolderPlus, Folder, Edit2, Trash2, Save, X, 
  ChevronRight, ArrowRight, CornerDownRight 
} from "lucide-react";

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Стан форми
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: "", // Можна редагувати ID
    name: "",
    parent_id: "null", // String "null" для зручності select
    aliases: "" // Рядок через кому
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("order", { ascending: true });
    setCategories(data || []);
    setLoading(false);
  }

  // Групуємо категорії для відображення (Батько -> Діти)
  const rootCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  // Підготовка до створення
  const handleCreate = () => {
    setEditingId("new");
    setFormData({ id: "", name: "", parent_id: "null", aliases: "" });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Підготовка до редагування
  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormData({
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id || "null",
        aliases: cat.aliases ? cat.aliases.join(", ") : ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!formData.id || !formData.name) return alert("ID та Назва обов'язкові!");

    const payload = {
        id: formData.id,
        name: formData.name,
        parent_id: formData.parent_id === "null" ? null : formData.parent_id,
        aliases: formData.aliases ? formData.aliases.split(",").map(s => s.trim()) : null
    };

    let error;

    if (editingId === "new") {
        // Створення
        const { error: err } = await supabase.from("categories").insert([payload]);
        error = err;
    } else {
        // Оновлення
        // Важливо: якщо змінити ID, це складніше, тому поки що ID readonly при редагуванні або треба update logic
        const { error: err } = await supabase.from("categories").update(payload).eq("id", editingId);
        error = err;
    }

    if (error) {
        alert("Помилка: " + error.message);
    } else {
        setEditingId(null);
        fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Видалити категорію? Якщо у неї є підкатегорії, вони стануть кореневими.")) return;
      await supabase.from("categories").delete().eq("id", id);
      fetchCategories();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Категорії магазину</h1>
        <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transition">
            <FolderPlus size={20}/> Додати категорію
        </button>
      </div>

      {/* ФОРМА РЕДАГУВАННЯ */}
      {editingId && (
          <div className="bg-[#1a1a1a] border border-blue-500/50 rounded-2xl p-6 mb-8 shadow-2xl animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">
                      {editingId === "new" ? "Створення нової категорії" : "Редагування категорії"}
                  </h3>
                  <button onClick={() => setEditingId(null)}><X size={20} className="text-gray-500 hover:text-white"/></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID (для зв'язку з 1С)</label>
                      <input 
                        type="text" 
                        className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-mono"
                        placeholder="Напр. 189 або bags"
                        value={formData.id}
                        onChange={e => setFormData({...formData, id: e.target.value})}
                        disabled={editingId !== "new"} // ID не можна міняти після створення (бо це Primary Key)
                      />
                      <p className="text-[10px] text-gray-600 mt-1">Унікальний ідентифікатор. Не можна змінити після створення.</p>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Назва категорії</label>
                      <input 
                        type="text" 
                        className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        placeholder="Напр. Сумки"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Батьківська категорія</label>
                      <select 
                        className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.parent_id}
                        onChange={e => setFormData({...formData, parent_id: e.target.value})}
                      >
                          <option value="null">-- Це коренева категорія --</option>
                          {categories.filter(c => c.id !== editingId).map(c => (
                              <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Синоніми (Aliases)</label>
                      <input 
                        type="text" 
                        className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        placeholder="Через кому: Рюкзаки, Портфелі..."
                        value={formData.aliases}
                        onChange={e => setFormData({...formData, aliases: e.target.value})}
                      />
                      <p className="text-[10px] text-gray-600 mt-1">Використовується для розумного пошуку в меню.</p>
                  </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setEditingId(null)} className="px-6 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition">Скасувати</button>
                  <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition font-bold flex items-center gap-2">
                      <Save size={18}/> Зберегти
                  </button>
              </div>
          </div>
      )}

      {/* СПИСОК КАТЕГОРІЙ (ДЕРЕВО) */}
      <div className="space-y-4">
          {loading ? <p className="text-gray-500">Завантаження...</p> : rootCategories.map(root => (
              <div key={root.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden">
                  {/* Батько */}
                  <div className="flex items-center justify-between p-4 bg-[#222]">
                      <div className="flex items-center gap-4">
                          <Folder className="text-blue-500" size={24}/>
                          <div>
                              <div className="font-bold text-lg text-white">{root.name}</div>
                              <div className="text-xs text-gray-500 font-mono">ID: {root.id} {root.aliases && `| ${root.aliases.join(", ")}`}</div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(root)} className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition"><Edit2 size={18}/></button>
                          <button onClick={() => handleDelete(root.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-500 transition"><Trash2 size={18}/></button>
                      </div>
                  </div>

                  {/* Діти */}
                  <div className="bg-[#151515] p-2 space-y-1">
                      {getChildren(root.id).map(child => (
                          <div key={child.id} className="flex items-center justify-between p-3 pl-8 hover:bg-white/5 rounded-lg transition group ml-4 border-l border-white/10">
                              <div className="flex items-center gap-3">
                                  <CornerDownRight className="text-gray-600" size={16}/>
                                  <div>
                                      <div className="text-gray-300 font-medium">{child.name}</div>
                                      <div className="text-[10px] text-gray-600 font-mono">ID: {child.id}</div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                  <button onClick={() => handleEdit(child)} className="p-1.5 hover:bg-white/10 rounded text-blue-400"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDelete(child.id)} className="p-1.5 hover:bg-white/10 rounded text-red-500"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      ))}
                      {getChildren(root.id).length === 0 && (
                          <div className="pl-12 py-2 text-xs text-gray-600 italic">Немає підкатегорій</div>
                      )}
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
}