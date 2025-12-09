"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Search, Plus, Edit2, Trash2, Package, RefreshCw, 
  ChevronLeft, ChevronRight, Filter, CheckSquare, Square, X, FolderInput, Check
} from "lucide-react";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";

// --- ТИПИ ---
interface Product {
  id: string;
  title: string;
  vendor_article: string; 
  base_price: number;
  image_url: string;
  supplier_id: string;
  total_stock: number; 
  supplier_name: string;
  category_name: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

export default function AdminProducts() {
  // --- СТАН ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Пагінація та Пошук
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Фільтри
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");

  // Масові дії
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Модальне вікно для зміни категорії
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");

  // --- ЗАВАНТАЖЕННЯ ДАНИХ ---
  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
    // Скидаємо виділення при зміні сторінки або фільтрів
    setSelectedIds(new Set()); 
  }, [page, search, selectedSupplierId]);

  async function fetchSuppliers() {
    const { data } = await supabase.from('suppliers').select('id, name');
    if (data) setSuppliers(data);
  }

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('id, name, parent_id').order('name');
    if (data) setCategories(data);
  }

  async function fetchProducts() {
    setLoading(true);
    
    let query = supabase
      .from("products")
      .select(`
            *,
            suppliers (name),
            categories (name),
            product_variants!left (stock)
        `, { count: "exact" }); 

    // Пошук
    if (search) {
        const searchLower = search.toLowerCase();
        query = query.or(`title.ilike.%${searchLower}%,vendor_article.ilike.%${searchLower}%`);
    }

    // Фільтр по постачальнику
    if (selectedSupplierId !== "all") {
        query = query.eq('supplier_id', selectedSupplierId);
    }
    
    // Пагінація
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, count, error } = await query
      .range(from, to)
      .order("id", { ascending: false });

    if (error) {
        console.error("Error fetching products:", error);
    } else {
        const processedData = (data || []).map((p: any) => {
            const totalStock = p.product_variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
            return {
                ...p,
                id: p.id,
                title: p.title,
                vendor_article: p.vendor_article,
                base_price: p.base_price,
                image_url: p.image_url,
                supplier_id: p.supplier_id,
                total_stock: totalStock,
                supplier_name: p.suppliers?.name || 'N/A',
                category_name: p.categories?.name || 'Без категорії',
            } as Product;
        });
        setProducts(processedData);
        setTotal(count || 0);
    }
    setLoading(false);
  }

  // --- ЛОГІКА ВИДІЛЕННЯ ---
  const handleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set()); // Зняти все
    } else {
      const allIds = new Set(products.map(p => p.id));
      setSelectedIds(allIds);
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // --- МАСОВІ ДІЇ ---
  const handleBulkDelete = async () => {
    if (!confirm(`Видалити ${selectedIds.size} товарів? Цю дію не можна скасувати.`)) return;

    const { error } = await supabase.from('products').delete().in('id', Array.from(selectedIds));
    if (error) alert("Помилка видалення: " + error.message);
    else {
        fetchProducts();
        setSelectedIds(new Set());
    }
  };

  const handleBulkMoveCategory = async () => {
    if (!targetCategoryId) return alert("Оберіть категорію");

    const { error } = await supabase
        .from('products')
        .update({ 
            category_id: targetCategoryId,
            is_manual_category: true // Важливо! Щоб синхронізація не перенесла назад
        })
        .in('id', Array.from(selectedIds));

    if (error) alert("Помилка оновлення: " + error.message);
    else {
        setIsCategoryModalOpen(false);
        fetchProducts();
        setSelectedIds(new Set());
        alert("Категорію успішно змінено!");
    }
  };

  // --- ДОПОМІЖНІ ---
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Підготовка дерева категорій для селекта
  const categoryOptions = useMemo(() => {
     const options: {id: string, name: string}[] = [];
     const map = new Map(categories.map(c => [c.id, c]));
     categories.forEach(cat => {
        let displayName = cat.name;
        if (cat.parent_id && map.has(cat.parent_id)) {
            displayName = `${map.get(cat.parent_id)?.name} > ${cat.name}`;
        } else if (!cat.parent_id) {
            displayName = cat.name.toUpperCase();
        }
        options.push({ id: cat.id, name: displayName });
     });
     return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  return (
    <div className="text-white relative min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold">Товари</h1>
           <p className="text-gray-400 text-sm mt-1">Всього товарів: {total}</p>
        </div>
        <Link 
            href="/admin/products/new" 
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition"
        >
            <Plus size={20}/> Додати товар
        </Link>
      </div>

      {/* ПАНЕЛЬ ФІЛЬТРІВ (Верхня) */}
      <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 mb-6 flex flex-col md:flex-row gap-4 justify-between">
         
         {/* Пошук */}
         <div className="relative flex-1 max-w-md">
            <input 
                type="text" 
                placeholder="Пошук за назвою або артикулом..." 
                className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-blue-500 outline-none"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <Search size={18} className="absolute left-3 top-3 text-gray-500"/>
         </div>

         {/* Фільтр Постачальника */}
         <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-bold uppercase tracking-wider hidden md:block">Постачальник:</span>
            <select 
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="bg-black border border-white/10 rounded-lg py-2.5 px-4 text-white focus:border-blue-500 outline-none cursor-pointer"
            >
                <option value="all">Всі постачальники</option>
                {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
         </div>
      </div>

      {/* ПАНЕЛЬ МАСОВИХ ДІЙ (З'являється, коли вибрано товари) */}
      {selectedIds.size > 0 && (
          <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl mb-4 flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3 px-2">
                  <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                      Вибрано: {selectedIds.size}
                  </div>
                  <button onClick={() => setSelectedIds(new Set())} className="text-xs text-blue-300 hover:text-white underline">
                      Скасувати
                  </button>
              </div>
              
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold transition"
                  >
                      <FolderInput size={16}/> Змінити категорію
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                  >
                      <Trash2 size={16}/> Видалити
                  </button>
              </div>
          </div>
      )}

      {/* ТАБЛИЦЯ */}
      <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead><tr className="bg-[#222] text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                        <th className="p-4 w-10 text-center">
                            <button onClick={handleSelectAll} className="hover:text-white">
                                {selectedIds.size > 0 && selectedIds.size === products.length ? <CheckSquare size={20} className="text-blue-500"/> : <Square size={20}/>}
                            </button>
                        </th>
                        <th className="p-4 font-bold">Товар</th>
                        <th className="p-4 font-bold">Артикул</th>
                        <th className="p-4 font-bold">Категорія</th>
                        <th className="p-4 font-bold text-center">Ціна</th>
                        <th className="p-4 font-bold text-center">Залишок</th>
                        <th className="p-4 font-bold text-center">Постачальник</th>
                        <th className="p-4 font-bold text-right">Дії</th>
                    </tr></thead>
                <tbody className="divide-y divide-white/5 text-sm">
                    {loading ? (
                        <tr><td colSpan={8} className="p-10 text-center text-gray-500">Завантаження...</td></tr>
                    ) : products.length === 0 ? (
                        <tr><td colSpan={8} className="p-10 text-center text-gray-500">Товарів не знайдено</td></tr>
                    ) : (
                        products.map((product) => {
                            const isSelected = selectedIds.has(product.id);
                            return (
                                <tr key={product.id} className={`transition group ${isSelected ? 'bg-blue-900/10' : 'hover:bg-white/5'}`}>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleSelectOne(product.id)} className="text-gray-500 hover:text-white">
                                            {isSelected ? <CheckSquare size={20} className="text-blue-500"/> : <Square size={20}/>}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-black rounded-lg border border-white/10 overflow-hidden relative flex-shrink-0">
                                                {product.image_url ? (
                                                    <ProductImage src={product.image_url} alt={product.title} className="object-cover w-full h-full"/> 
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600"><Package size={20}/></div>
                                                )}
                                            </div>
                                            <div className="max-w-[200px] lg:max-w-[300px]">
                                                <div className="font-bold text-white truncate" title={product.title}>{product.title}</div>
                                                {/* <div className="text-xs text-gray-500">{product.id.slice(0,8)}</div> */}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-gray-300">{product.vendor_article}</td>
                                    <td className="p-4 text-xs text-gray-400">
                                        <span className="bg-white/5 px-2 py-1 rounded border border-white/10">{product.category_name}</span>
                                    </td>
                                    <td className="p-4 text-center font-bold text-white">
                                        {product.base_price} <span className="text-xs text-gray-500 font-normal">грн</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {product.total_stock > 0 ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-900/50">
                                                {product.total_stock} шт
                                            </span>
                                        ) : (
                                            <span className="text-gray-500 text-xs">0</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-xs text-blue-400">
                                            <RefreshCw size={12}/> {product.supplier_name}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition">
                                            <Link href={`/admin/products/edit/${product.id}`} className="p-2 bg-blue-900/20 text-blue-400 rounded-lg hover:bg-blue-900/40 transition">
                                                <Edit2 size={16}/>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
        
        {/* ПАГІНАЦІЯ */}
        <div className="bg-[#222] p-4 flex justify-between items-center border-t border-white/5">
            <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
                <ChevronLeft size={16}/> Попередня
            </button>
            <span className="text-sm text-gray-500">Сторінка {page} з {totalPages || 1}</span>
            <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages || totalPages === 0}
                className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
                Наступна <ChevronRight size={16}/>
            </button>
        </div>
      </div>

      {/* МОДАЛЬНЕ ВІКНО МАСОВОГО РЕДАГУВАННЯ КАТЕГОРІЇ */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white">Перемістити {selectedIds.size} товарів</h3>
                      <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-gray-400 text-sm">Оберіть нову категорію для вибраних товарів. Це також зафіксує категорію вручну.</p>
                      <select 
                          className="w-full bg-black border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                          value={targetCategoryId}
                          onChange={(e) => setTargetCategoryId(e.target.value)}
                      >
                          <option value="">-- Оберіть категорію --</option>
                          {categoryOptions.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                      </select>
                  </div>
                  <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                      <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition">Скасувати</button>
                      <button onClick={handleBulkMoveCategory} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2">
                          <Check size={16}/> Застосувати
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}