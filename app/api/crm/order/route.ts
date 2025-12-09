import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Отримуємо дані про замовлення від фронтенду
    const body = await req.json();

    // 2. Логуємо дані (Тут пізніше буде реальний запит до API вашої CRM)
    console.log('📦 [CRM SYNC] Нове замовлення отримано:', body.externalId);
    console.log('Деталі:', JSON.stringify(body, null, 2));

    /* Приклад, як це буде виглядати пізніше:
       const crmRes = await fetch('https://your-crm.com/api/orders', {
           method: 'POST',
           body: JSON.stringify(body)
       });
    */

    // 3. Повертаємо успішну відповідь фронтенду
    return NextResponse.json({ success: true, message: 'Order received and logged' });

  } catch (error: any) {
    console.error('❌ CRM Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}