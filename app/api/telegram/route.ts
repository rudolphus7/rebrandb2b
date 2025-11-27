import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(request: Request) {
  try {
    // Отримуємо дані про замовлення від фронтенду
    const { email, total, items } = await request.json();

    // Формуємо текст повідомлення
    const text = `
📦 <b>НОВЕ ЗАМОВЛЕННЯ!</b>
👤 Клієнт: ${email}
💰 Сума: <b>${total} грн</b>
🛒 Товарів: ${items.length} шт.
    `;

    // Відправляємо запит на сервери Telegram
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: 'HTML', // Дозволяє робити текст жирним
      }),
    });

    if (!response.ok) {
        return NextResponse.json({ error: 'Telegram error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}