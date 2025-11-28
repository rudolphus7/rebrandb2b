"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminProductForm from "../../../../components/AdminProductForm"; // Шлях може відрізнятись

export default function EditProductPage() {
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
        if (!params.id) return;
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', params.id)
            .single();
        
        if (error) {
            console.error(error);
            alert("Не вдалося завантажити товар");
        } else {
            setProduct(data);
        }
        setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <div className="p-10 text-center text-gray-500">Завантаження...</div>;
  if (!product) return <div className="p-10 text-center text-red-500">Товар не знайдено</div>;

  return <AdminProductForm initialData={product} isNew={false} />;
}