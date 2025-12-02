import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Перевіряємо, чи є налаштування
    const CRM_URL = process.env.CRM_WEBHOOK_URL;
    const API_KEY = process.env.CRM_API_KEY;

    if (!CRM_URL || !API_KEY) {
      console.error("CRM settings missing in .env.local");
      return NextResponse.json({ success: false, error: "CRM not configured" }, { status: 500 });
    }

    // Відправляємо запит на CRM
    const response = await fetch(CRM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CRM Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, crm_response: data });

  } catch (error: any) {
    console.error("CRM Sync Failed:", error.message);
    // Ми не повертаємо 500, щоб не ламати фронтенд (замовлення в базі вже створено)
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}