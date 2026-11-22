import { NextResponse } from 'next/server';
import { PLACEMENT_LABELS, SIZE_LABELS, METHOD_LABELS } from '@/lib/brandingTypes';
import { getAuthenticatedUser } from '@/lib/serverAuth';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const orderDataStr = formData.get('orderData') as string;

    if (!orderDataStr) {
      return NextResponse.json({ error: 'Missing order data' }, { status: 400 });
    }

    const orderData = JSON.parse(orderDataStr);
    const {
      email,
      total,
      items,
      delivery,
      phone,
      name,
      pay_amount,
      bonuses_used,
      orderId,
      payment,
      comment
    } = orderData;

    // 1. Send main order message
    let messageText = `
📦 <b>НОВЕ ЗАМОВЛЕННЯ #${escapeHtml(orderId)}</b>

👤 <b>Клієнт:</b> ${escapeHtml(name)}
📧 Email: ${escapeHtml(email)}
📱 Телефон: ${escapeHtml(phone)}

💰 <b>Сума товарів:</b> ${Number(total) || 0} грн
${Number(bonuses_used) > 0 ? `🎁 Бонусами: -${Number(bonuses_used)} грн\n` : ''}💳 <b>До сплати:</b> ${Number(pay_amount) || 0} грн
💳 <b>Спосіб оплати:</b> ${payment === 'invoice' ? 'Рахунок' : 'Картка'}

🛒 <b>Товари:</b>
${items.map((item: any, i: number) => {
      const itemTotal = item.price * item.quantity;
      const brandingTotal = item.branding?.enabled ? item.branding.price * item.quantity : 0;
      const brandingInfo = item.branding?.enabled
        ? `\n   🎨 <b>Брендування:</b> ${escapeHtml(PLACEMENT_LABELS[item.branding.placement as keyof typeof PLACEMENT_LABELS])}, ${escapeHtml(SIZE_LABELS[item.branding.size as keyof typeof SIZE_LABELS])}, ${escapeHtml(METHOD_LABELS[item.branding.method as keyof typeof METHOD_LABELS])} (+${Number(item.branding.price) || 0} грн/шт = ${brandingTotal} грн)`
        : '';

      return `${i + 1}. ${escapeHtml(item.title)}${item.size && item.size !== 'One Size' ? ` (${escapeHtml(item.size)})` : ''} x${Number(item.quantity) || 0} - ${itemTotal} грн${brandingInfo}`;
    }).join('\n')}

🚚 <b>Доставка:</b> ${escapeHtml(delivery)}
${comment ? `\n💬 <b>Коментар:</b> ${escapeHtml(comment)}` : ''}
`;

    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const messageResponse = await fetch(sendMessageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'HTML',
      }),
    });

    if (!messageResponse.ok) {
      console.error('Telegram message error:', await messageResponse.text());
    }

    // 2. Send visualization if present
    const visualization = formData.get('visualization') as File;
    if (visualization) {
      const vizFormData = new FormData();
      vizFormData.append('chat_id', CHAT_ID!);
      vizFormData.append('photo', visualization);
      vizFormData.append('caption', `🖼️ <b>Візуалізація замовлення #${orderId}</b>`);
      vizFormData.append('parse_mode', 'HTML');

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: vizFormData,
      });
    }

    // 3. Send logo files
    const logoEntries: Array<{ file: File; itemId: string; index: number }> = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('logo_') && !key.endsWith('_itemId')) {
        const index = parseInt(key.split('_')[1]);
        const itemId = formData.get(`${key}_itemId`) as string;
        logoEntries.push({ file: value as File, itemId, index });
      }
    }

    // Send each logo file with caption
    for (const { file, itemId, index } of logoEntries) {
      const item = items[index];
      if (!item || !item.branding) continue;

      const caption = `🎨 <b>Логотип для замовлення #${orderId}</b>\n\n📦 Товар: ${item.title}${item.size && item.size !== 'One Size' ? ` (${item.size})` : ''}\n📍 Розміщення: ${PLACEMENT_LABELS[item.branding.placement as keyof typeof PLACEMENT_LABELS]}\n📏 Розмір: ${SIZE_LABELS[item.branding.size as keyof typeof SIZE_LABELS]}\n🖨️ Метод: ${METHOD_LABELS[item.branding.method as keyof typeof METHOD_LABELS]}`;

      const fileFormData = new FormData();
      fileFormData.append('chat_id', CHAT_ID!);
      fileFormData.append('document', file);
      fileFormData.append('caption', caption);
      fileFormData.append('parse_mode', 'HTML');

      const sendDocumentUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`;
      const fileResponse = await fetch(sendDocumentUrl, {
        method: 'POST',
        body: fileFormData,
      });

      if (!fileResponse.ok) {
        console.error(`Telegram file upload error for item ${index}:`, await fileResponse.text());
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Telegram error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}