import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Цей ключ має співпадати з тим, що ви налаштуєте в Vercel (змінна CRM_API_KEY)
const WEBHOOK_SECRET = process.env.CRM_API_KEY; 

export async function POST(request: Request) {
  console.log("🔄 [Webhook] Отримано запит від CRM...");

  try {
    // 1. Перевірка безпеки (Authentication)
    // CRM має надсилати заголовок 'x-api-key' з вашим ключем
    const apiKey = request.headers.get('x-api-key');

    if (!WEBHOOK_SECRET) {
        console.error("⛔ [Webhook] Сервер не налаштований (немає CRM_API_KEY в env)");
        return NextResponse.json({ success: false, error: "Server misconfiguration" }, { status: 500 });
    }

    if (apiKey !== WEBHOOK_SECRET) {
      console.error(`⛔ [Webhook] Невірний ключ доступу! Отримано: ${apiKey?.slice(0, 5)}...`);
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Розбір даних (Parsing)
    const body = await request.json();
    console.log("📦 [Webhook] Payload:", body);

    // Очікуємо структуру: { "orderId": 123, "status": "shipped", "ttn": "204500..." }
    // Або: { "externalId": "ORD-123", "status": "shipped" }
    
    const { orderId, externalId, status, ttn } = body;

    // Визначаємо ID замовлення (очищаємо від префіксів, якщо треба)
    let cleanId = orderId;
    if (!cleanId && externalId) {
        // Якщо CRM надсилає ID як "ORD-123", обрізаємо "ORD-"
        cleanId = externalId.toString().replace('ORD-', '');
    }

    if (!cleanId || !status) {
        return NextResponse.json({ success: false, error: "Missing orderId or status" }, { status: 400 });
    }

    // 3. Оновлення в базі даних (Update)
    // Мапимо статуси CRM на статуси нашого сайту
    // Ліва частина - як називає CRM, Права частина - як називає наш Сайт (в базі)
    const statusMap: Record<string, string> = {
        "new": "new",             // Нове
        "in_process": "processing", // В обробці
        "sent": "shipped",        // Відправлено
        "done": "completed",      // Виконано
        "success": "completed",   // (на всяк випадок)
        "cancel": "cancelled",    // Скасовано
        "fail": "cancelled"       // (на всяк випадок)
    };

    const siteStatus = statusMap[status] || status; // Якщо немає в мапі, пишемо як є

    console.log(`🔄 [Webhook] Зміна статусу для #${cleanId}: ${status} -> ${siteStatus}`);

    const updateData: any = { 
        status: siteStatus,
        updated_at: new Date().toISOString()
    };

    // Якщо прийшла ТТН, оновлюємо поле delivery_data
    if (ttn) {
        // Спочатку треба отримати поточні дані, щоб не затерти адресу та ім'я
        const { data: currentOrder } = await supabase
            .from('orders')
            .select('delivery_data')
            .eq('id', cleanId)
            .single();
            
        if (currentOrder) {
            updateData.delivery_data = {
                ...currentOrder.delivery_data, // Зберігаємо старі дані (місто, склад, ПІБ)
                ttn: ttn // Додаємо/Оновлюємо ТТН
            };
        }
    }

    const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', cleanId);

    if (error) {
        console.error("❌ [Webhook] Помилка оновлення в Supabase:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log(`✅ [Webhook] Успішно! Замовлення #${cleanId} оновлено.`);
    return NextResponse.json({ success: true, message: "Order updated" });

  } catch (error: any) {
    console.error("❌ [Webhook] Глобальна помилка:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}