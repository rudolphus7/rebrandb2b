import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log("🚀 [CRM] Початок синхронізації замовлення...");

  try {
    const body = await request.json();
    console.log("📦 [CRM] Отримано дані замовлення ID:", body.externalId);

    // 1. Перевірка змінних
    const CRM_URL = process.env.CRM_WEBHOOK_URL;
    const API_KEY = process.env.CRM_API_KEY;

    // Логуємо статус змінних (не показуючи сам ключ для безпеки)
    console.log("🔑 [CRM] Перевірка налаштувань:", {
      CRM_WEBHOOK_URL: CRM_URL ? "✅ Встановлено" : "❌ ВІДСУТНЄ",
      CRM_API_KEY: API_KEY ? "✅ Встановлено" : "❌ ВІДСУТНЄ"
    });

    if (!CRM_URL || !API_KEY) {
      const missingVars = [];
      if (!CRM_URL) missingVars.push("CRM_WEBHOOK_URL");
      if (!API_KEY) missingVars.push("CRM_API_KEY");

      console.error(`❌ [CRM] Помилка: На сервері відсутні змінні середовища: ${missingVars.join(", ")}`);
      
      return NextResponse.json({ 
        success: false, 
        error: `Server configuration error: Missing ${missingVars.join(", ")}. Check Vercel Environment Variables.` 
      }, { status: 500 });
    }

    // 2. Відправка запиту
    console.log("📤 [CRM] Відправка запиту на:", CRM_URL);
    
    const response = await fetch(CRM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    console.log(`📥 [CRM] Відповідь сервера (${response.status}):`, responseText);

    if (!response.ok) {
      throw new Error(`CRM Error ${response.status}: ${responseText}`);
    }

    console.log("✅ [CRM] Успішно синхронізовано!");
    return NextResponse.json({ success: true, crm_response: responseText });

  } catch (error: any) {
    console.error("❌ [CRM] ГЛОБАЛЬНА ПОМИЛКА:", error.message);
    // Повертаємо 200, щоб фронтенд думав, що все ок (замовлення ж створено в БД), але пишемо помилку в тілі
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}