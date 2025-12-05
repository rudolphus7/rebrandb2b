import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 20; // Кількість замовлень на одній сторінці

export default async function AdminOrdersPage({
  searchParams,
}: {
  // Типізація для сумісності з Next.js 15 (де це Promise) і Next.js 14
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  // 1. Створюємо серверний клієнт Supabase
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

  // 2. Отримуємо параметри з URL (фільтри, пагінація, дати)
  const resolvedParams = await searchParams;
  
  const statusFilter = typeof resolvedParams?.status === 'string' ? resolvedParams.status : 'all';
  const page = typeof resolvedParams?.page === 'string' ? parseInt(resolvedParams.page) : 1;
  const dateFrom = typeof resolvedParams?.dateFrom === 'string' ? resolvedParams.dateFrom : null;
  const dateTo = typeof resolvedParams?.dateTo === 'string' ? resolvedParams.dateTo : null;

  // Розрахунок діапазону для пагінації (Supabase range is inclusive)
  const fromOffset = (page - 1) * ITEMS_PER_PAGE;
  const toOffset = fromOffset + ITEMS_PER_PAGE - 1;

  // 3. Формуємо запит до бази
  let query = supabase
    .from("orders")
    .select("*", { count: 'exact' }) // Отримуємо також загальну кількість для пагінації
    .order("created_at", { ascending: false })
    .range(fromOffset, toOffset);

  // 4. Застосовуємо фільтри
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq("status", statusFilter);
  }

  if (dateFrom) {
    // Початок обраного дня (00:00:00)
    query = query.gte("created_at", `${dateFrom}T00:00:00`);
  }

  if (dateTo) {
    // Кінець обраного дня (23:59:59)
    query = query.lte("created_at", `${dateTo}T23:59:59`);
  }

  // 5. Виконуємо запит (на сервері!)
  const { data: orders, error, count } = await query;

  if (error) {
    console.error("Помилка завантаження замовлень:", error);
    return <div className="text-red-500 p-10">Помилка завантаження даних: {error.message}</div>;
  }

  // Розрахунок кількості сторінок
  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 1;

  // 6. Віддаємо дані в клієнтський компонент
  return (
    <OrdersClient 
      initialOrders={orders || []} 
      totalCount={count || 0}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}