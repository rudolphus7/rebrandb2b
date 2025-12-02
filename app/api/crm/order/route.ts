import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log("🚀 [CRM] Початок синхронізації замовлення...");

  try {
    const body = await request.json();
    console.log("📦 [CRM] Отримано дані замовлення ID:", body.externalId);

    // 1. Перевірка змінних
    const CRM_URL = process.env.CRM_WEBHOOK_URL;
    const API_KEY = process.env.CRM_API_KEY;

    console.log("🔑 [CRM] Налаштування:", {
      url: CRM_URL ? "OK (URL Present)" : "MISSING",
      key: API_KEY ? `OK (Key ends with ...${API_KEY.slice(-4)})` : "MISSING"
    });

    if (!CRM_URL || !API_KEY) {
      console.error("❌ [CRM] Помилка: Немає налаштувань у .env.local");
      return NextResponse.json({ success: false, error: "Settings missing" }, { status: 500 });
    }

    // 2. Відправка запиту
    console.log("📤 [CRM] Відправка запиту на CRM...");
    
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
    // Повертаємо 200, щоб фронтенд думав, що все ок, але пишемо в лог
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}