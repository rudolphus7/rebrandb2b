import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ініціалізація Supabase (використовуємо Service Role Key для прав на запис без логіна юзера)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    // 1. ПЕРЕВІРКА БЕЗПЕКИ (API KEY)
    const apiKey = req.headers.get('x-api-key');
    const secretKey = process.env.CRM_WEBHOOK_SECRET;

    if (!apiKey || apiKey !== secretKey) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Key' }, { status: 401 });
    }

    // 2. ОТРИМАННЯ ДАНИХ
    const body = await req.json();
    const { orderId, status, ttn } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    console.log(`📡 Отримано оновлення від CRM: Замовлення #${orderId}, Статус: ${status}, ТТН: ${ttn}`);

    // 3. МАПІНГ СТАТУСІВ (Опціонально)
    // Якщо в CRM статуси називаються інакше, ніж на сайті, переведи їх тут
    let portalStatus = status;
    const statusMap: Record<string, string> = {
      'sent': 'shipped',       // CRM "sent" -> Сайт "shipped"
      'completed': 'completed',
      'canceled': 'cancelled', // CRM "canceled" -> Сайт "cancelled" (подвійна L)
      'processing': 'processing'
    };

    if (statusMap[status]) {
      portalStatus = statusMap[status];
    }

    // 4. ОНОВЛЕННЯ БАЗИ ДАНИХ (Supabase)
    const updateData: any = { 
      status: portalStatus,
      updated_at: new Date().toISOString()
    };

    // Якщо прийшла ТТН, додаємо її до оновлення
    if (ttn) {
      updateData.ttn = ttn;
    }

    const { error } = await supabase
      .from('orders') // Твоя таблиця замовлень на B2B порталі
      .update(updateData)
      .eq('id', orderId); // Шукаємо за ID замовлення (або external_id, як налаштовано)

    if (error) {
      console.error('Database Update Error:', error);
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
    }

    // 5. УСПІХ
    return NextResponse.json({ success: true, message: 'Order updated successfully' });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}