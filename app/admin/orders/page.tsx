import { supabaseAdmin } from "@/lib/supabaseAdmin"; // Або ваш createClient
import OrdersClient from "./OrdersClient";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ITEMS_PER_PAGE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const queryText = params.q || '';
  const page = parseInt(params.page || '1');
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Будуємо запит
  let query = supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Фільтрація (Безпечний пошук по числовому ID або Email)
  const trimmedQuery = queryText.trim();
  if (trimmedQuery) {
    const safeEmailQuery = trimmedQuery.replace(/[,%()]/g, ' ').trim();
    if (/^\d+$/.test(trimmedQuery)) {
      query = query.or(`id.eq.${trimmedQuery},user_email.ilike.%${safeEmailQuery}%`);
    } else if (safeEmailQuery) {
      query = query.ilike('user_email', `%${safeEmailQuery}%`);
    }
  }

  const { data, count } = await query.range(from, to);

  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0;

  return (
    <OrdersClient 
      initialOrders={data || []} 
      totalCount={count || 0}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}