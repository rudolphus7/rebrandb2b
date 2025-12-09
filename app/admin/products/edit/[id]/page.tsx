import { createClient } from "@supabase/supabase-js";
import AdminProductForm from "@/components/AdminProductForm";
import { notFound } from "next/navigation";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Вимикаємо кешування для адмінки
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditProductPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    // КРИТИЧНО: розгортаємо Promise
    const { id } = await params;
    
    if (!id) notFound();

    // Запит для завантаження даних
    const { data: product, error } = await supabase
        .from('products')
        .select(`*`)
        .eq('id', id)
        .single();

    if (error || !product) {
        notFound(); 
    }

    // Оскільки ціни в базі можуть бути null, приводимо їх до коректного вигляду для форми
    const initialData = {
        ...product,
        base_price: product.base_price || 0,
        old_price: product.old_price || null,
        id: id, 
    };

    return (
        <div className="p-8">
            <AdminProductForm initialData={initialData} isNew={false} />
        </div>
    );
}