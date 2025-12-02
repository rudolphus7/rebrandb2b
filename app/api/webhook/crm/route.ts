import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Цей ключ має співпадати з тим, що ви налаштуєте в CRM для відправки вебхуків
const WEBHOOK_SECRET = process.env.CRM_API_KEY; 

export async function POST(request: Request) {
  console.log("🔄 [Webhook] Отримано запит від CRM...");

  try {
    // 1. Перевірка безпеки (Authentication)
    // CRM має надсилати заголовок 'x-api-key' або 'Authorization'
    const apiKey = request.headers.get('x-api-key');

    if (apiKey !== WEBHOOK_SECRET) {
      console.error("⛔ [Webhook] Невірний ключ доступу!");
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
        cleanId = externalId.replace('ORD-', '');
    }

    if (!cleanId || !status) {
        return NextResponse.json({ success: false, error: "Missing orderId or status" }, { status: 400 });
    }

    // 3. Оновлення в базі даних (Update)
    // Мапимо статуси CRM на статуси нашого сайту
    // CRM statuses: "new", "in_process", "sent", "done", "cancel"
    // Site statuses: "new", "processing", "shipped", "completed", "cancelled"
    
    const statusMap: Record<string, string> = {
        "new": "new",
        "in_process": "processing",
        "sent": "shipped",
        "done": "completed",
        "cancel": "cancelled"
    };

    const siteStatus = statusMap[status] || status; // Якщо немає в мапі, пишемо як є

    const updateData: any = { 
        status: siteStatus,
        updated_at: new Date().toISOString()
    };

    // Якщо прийшла ТТН, додаємо її в коментар або спеціальне поле (якщо є)
    // Тут ми просто допишемо в delivery_data, щоб не ламати структуру
    if (ttn) {
        // Спочатку треба отримати поточні дані, щоб не затерти їх
        const { data: currentOrder } = await supabase
            .from('orders')
            .select('delivery_data')
            .eq('id', cleanId)
            .single();
            
        if (currentOrder) {
            updateData.delivery_data = {
                ...currentOrder.delivery_data,
                ttn: ttn // Додаємо ТТН
            };
        }
    }

    const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', cleanId);

    if (error) {
        console.error("❌ [Webhook] Помилка оновлення:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log(`✅ [Webhook] Замовлення #${cleanId} оновлено на статус '${siteStatus}'`);
    return NextResponse.json({ success: true, message: "Order updated" });

  } catch (error: any) {
    console.error("❌ [Webhook] Глобальна помилка:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}