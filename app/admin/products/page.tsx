"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Search, Plus, Edit2, Trash2, Package, RefreshCw, 
  ChevronLeft, ChevronRight, Filter 
} from "lucide-react";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";

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

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchProducts();
  }, [page, search]); 

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

    if (search) {
        const searchLower = search.toLowerCase();
        query = query.or(`title.ilike.%${searchLower}%,vendor_article.ilike.%${searchLower}%`);
    }
    
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

  async function handleDelete(id: string) {
      if (!confirm("Ви впевнені? Це видалить товар з магазину.")) return;
      
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
          alert("Помилка видалення: " + error.message);
      } else {
          fetchProducts(); 
      }
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="text-white">
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

      <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 mb-6 flex gap-4">
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
         <button className="p-2.5 bg-black border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/30 transition">
            <Filter size={20}/>
         </button>
      </div>

      <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-[#222] text-gray-400 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold">Товар</th>
                        <th className="p-4 font-bold">Артикул</th>
                        <th className="p-4 font-bold">Категорія</th>
                        <th className="p-4 font-bold text-center">Ціна</th>
                        <th className="p-4 font-bold text-center">Залишок</th>
                        <th className="p-4 font-bold text-center">Постачальник</th>
                        <th className="p-4 font-bold text-right">Дії</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                    {loading ? (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500">Завантаження...</td>
                        </tr>
                    ) : products.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500">Товарів не знайдено</td>
                        </tr>
                    ) : (
                        products.map((product) => (
                            <tr key={product.id} className="hover:bg-white/5 transition group">
                                <td className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-black rounded-lg border border-white/10 overflow-hidden relative flex-shrink-0">
                                            {product.image_url ? (
                                                <ProductImage src={product.image_url} alt={product.title} className="object-cover w-full h-full"/> 
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <Package size={20}/>
                                                </div>
                                            )}
                                        </div>
                                        <div className="max-w-[250px]">
                                            <div className="font-bold text-white truncate" title={product.title}>{product.title}</div>
                                            <div className="text-xs text-gray-500">{product.category_name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-gray-300">{product.vendor_article}</td>
                                <td className="p-4 text-xs text-gray-500">{product.category_name}</td>
                                <td className="p-4 text-center font-bold text-white">
                                    {product.base_price} <span className="text-xs text-gray-500 font-normal">грн</span>
                                </td>
                                <td className="p-4 text-center">
                                    {product.total_stock > 0 ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-900/50">
                                            {product.total_stock} шт
                                        </span>
                                    ) : (
                                        <span className="text-gray-500 text-xs">Немає</span>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1 text-xs text-blue-400" title="Синхронізовано">
                                        <RefreshCw size={12}/> {product.supplier_name}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                        <Link href={`/admin/products/edit/${product.id}`} className="p-2 bg-blue-900/20 text-blue-400 rounded-lg hover:bg-blue-900/40 transition">
                                            <Edit2 size={16}/>
                                        </Link>
                                        <button onClick={() => handleDelete(product.id)} className="p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        
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
    </div>
  );
}