import { NextResponse } from 'next/server';

// Якщо в майбутньому ти захочеш оновлювати статус замовлення в БД після відправки,
// розкоментуй цей імпорт. Це наш "Admin" клієнт, який обходить RLS.
// import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface OrderBody {
  externalId: string | number;
  [key: string]: any; // Дозволяємо інші поля
}

export async function POST(request: Request) {
  const start = Date.now();
  console.log("🚀 [CRM Sync] Початок процесу...");

  try {
    // 1. Отримання та валідація даних
    const body: OrderBody = await request.json();
    
    if (!body || !body.externalId) {
      console.error("❌ [CRM Sync] Помилка: Не отримано ID замовлення (externalId)");
      return NextResponse.json({ success: false, error: "Missing externalId" }, { status: 400 });
    }

    console.log(`📦 [CRM Sync] Обробка замовлення ID: ${body.externalId}`);

    // 2. Перевірка змінних середовища
    const CRM_URL = process.env.CRM_WEBHOOK_URL;
    const API_KEY = process.env.CRM_API_KEY;

    if (!CRM_URL || !API_KEY) {
      const missingVars = [];
      if (!CRM_URL) missingVars.push("CRM_WEBHOOK_URL");
      if (!API_KEY) missingVars.push("CRM_API_KEY");

      console.error(`❌ [CRM Sync] Server Error: Відсутні змінні: ${missingVars.join(", ")}`);
      return NextResponse.json({ 
        success: false, 
        error: `Configuration Error: Missing ${missingVars.join(", ")}` 
      }, { status: 500 });
    }

    // 3. Відправка запиту в CRM
    console.log(`📤 [CRM Sync] Відправка на: ${CRM_URL}`);
    
    const response = await fetch(CRM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    const duration = Date.now() - start;

    // 4. Обробка відповіді
    if (!response.ok) {
      console.error(`❌ [CRM Sync] Помилка CRM (${response.status}):`, responseText);
      throw new Error(`CRM rejected request with status ${response.status}: ${responseText}`);
    }

    console.log(`✅ [CRM Sync] Успішно! (Час: ${duration}ms). Відповідь:`, responseText);

    // ТУТ МОЖНА ДОДАТИ ОНОВЛЕННЯ СТАТУСУ В БД
    // Наприклад: await supabaseAdmin.from('orders').update({ is_synced: true }).eq('id', body.externalId);

    return NextResponse.json({ success: true, crm_response: responseText });

  } catch (error: any) {
    console.error("❌ [CRM Sync] ГЛОБАЛЬНА ПОМИЛКА:", error.message);
    
    // Важливо: Повертаємо 200 (OK), щоб клієнт на фронтенді не панікував,
    // якщо CRM тимчасово лежить. Але у полі success передаємо false.
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Unknown error occurred" 
    }, { status: 200 });
  }
}