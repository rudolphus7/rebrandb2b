import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OrdersClient from './OrdersClient';

// Це робить сторінку динамічною (не кешується намертво), щоб бачити нові замовлення
export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // 1. Створюємо серверний клієнт Supabase
  const cookieStore = cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 2. Отримуємо параметри фільтрації з URL (наприклад ?status=new)
  const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : null;

  // 3. Формуємо запит до бази
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq("status", statusFilter);
  }

  // 4. Виконуємо запит (на сервері!)
  const { data: orders, error } = await query;

  if (error) {
    console.error("Помилка завантаження замовлень:", error);
    return <div className="text-red-500 p-10">Помилка завантаження даних: {error.message}</div>;
  }

  // 5. Віддаємо дані в клієнтський компонент
  return <OrdersClient initialOrders={orders || []} />;
}