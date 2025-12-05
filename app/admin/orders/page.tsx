import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  // Типізація для сумісності з Next.js 15 (де це Promise) і Next.js 14
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  // 1. Створюємо серверний клієнт Supabase
  // 🔥 FIX: Додаємо await, бо в Next.js 15 cookies() - це Promise
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ігноруємо помилку запису кук в Server Component
          }
        },
      },
    }
  );

  // 2. Отримуємо параметри фільтрації
  // 🔥 FIX: Додаємо await для searchParams
  const resolvedParams = await searchParams;
  const statusFilter = typeof resolvedParams?.status === 'string' ? resolvedParams.status : null;

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