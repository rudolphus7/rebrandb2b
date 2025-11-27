"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const router = useRouter();

  // Стан для форми додавання
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Перевірка адміна
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/"); // Якщо не адмін - викидаємо на головну
      }
      setSession(session);
      fetchProducts();
    });
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order('id', { ascending: false });
    setProducts(data || []);
  }

  // --- ДОДАВАННЯ ТОВАРУ ---
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !newTitle || !newPrice) return alert("Заповніть всі поля!");

    setUploading(true);

    try {
      // 1. Автоматичне очищення назви файлу (щоб не було кирилиці)
      const fileExt = file.name.split('.').pop();
      const cleanName = `${Date.now()}.${fileExt}`; // Називаємо файл поточною датою (унікально)
      const filePath = `${cleanName}`;

      // 2. Завантаження картинки
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Отримання публічного посилання
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      // 4. Запис у базу даних
      const { error: dbError } = await supabase.from('products').insert([
        {
          title: newTitle,
          price: parseFloat(newPrice),
          image_url: publicUrl
        }
      ]);

      if (dbError) throw dbError;

      alert("Товар успішно додано!");
      // Очищення форми
      setNewTitle("");
      setNewPrice("");
      setFile(null);
      // Оновлення списку
      fetchProducts();

    } catch (error: any) {
      alert("Помилка: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  // --- ВИДАЛЕННЯ ТОВАРУ ---
  async function handleDelete(id: number) {
    if (!confirm("Точно видалити цей товар?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      alert("Помилка видалення");
    } else {
      fetchProducts(); // Оновити список
    }
  }

  if (!session) return <div className="p-10">Перевірка доступу...</div>;

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Адмін-панель 🛠️</h1>
          <button onClick={() => router.push("/")} className="text-blue-600 hover:underline">
            ← На сайт
          </button>
        </div>

        {/* --- ФОРМА ДОДАВАННЯ --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-10">
          <h2 className="text-xl font-bold mb-4">Додати новий товар</h2>
          <form onSubmit={handleAddProduct} className="flex flex-col gap-4 md:flex-row items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm text-gray-600 mb-1">Назва товару</label>
              <input 
                type="text" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="Наприклад: Худі Berserk"
              />
            </div>
            
            <div className="w-full md:w-32">
              <label className="block text-sm text-gray-600 mb-1">Ціна (грн)</label>
              <input 
                type="number" 
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="0"
              />
            </div>

            <div className="w-full md:w-64">
              <label className="block text-sm text-gray-600 mb-1">Фото</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <button 
              disabled={uploading}
              className="w-full md:w-auto bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {uploading ? "Завантаження..." : "Додати"}
            </button>
          </form>
        </div>

        {/* --- СПИСОК ТОВАРІВ --- */}
        <h2 className="text-2xl font-bold mb-4">Всі товари ({products.length})</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {products.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                {item.image_url && (
                  <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                )}
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.price} грн</p>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(item.id)}
                className="text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded hover:bg-red-50"
              >
                Видалити
              </button>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}