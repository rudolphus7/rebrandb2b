import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateBrandingPrice } from '@/lib/brandingPricing';
import { calculateMaxWriteOff, calculateCashback, getCurrentTier } from '@/lib/loyaltyUtils';
import { PrintPlacement, PrintSize, PrintMethod } from '@/lib/brandingTypes';

interface OrderRequestItem {
  id: string;
  productId: string;
  slug?: string;
  title?: string;
  image?: string | null;
  quantity: number;
  color?: string;
  size?: string;
  vendorArticle?: string;
  branding?: {
    enabled: boolean;
    placement: PrintPlacement;
    size: PrintSize;
    method: PrintMethod;
    logoFileName?: string;
  };
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const items: OrderRequestItem[] = Array.isArray(body?.items) ? body.items : [];
    const requestedBonuses = Number(body?.bonusesToUse) || 0;
    const delivery = body?.delivery || {};

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'Кошик порожній' }, { status: 400 });
    }

    if (!delivery.city || !delivery.warehouse) {
      return NextResponse.json(
        { success: false, error: 'Вкажіть місто та відділення доставки' },
        { status: 400 }
      );
    }

    const productIds = Array.from(new Set(items.map((i) => i.productId).filter(Boolean)));
    if (productIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Некоректні товари в кошику' }, { status: 400 });
    }

    const { data: dbProducts, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, title, slug, base_price, vendor_article, image_url, product_variants(color, size, price)')
      .in('id', productIds);

    if (productsError || !dbProducts) {
      return NextResponse.json({ success: false, error: 'Не вдалося перевірити товари' }, { status: 500 });
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let totalPrice = 0;
    let totalItems = 0;
    const verifiedItems = [];
    const brandingDetails = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity < 1) {
        return NextResponse.json({ success: false, error: 'Некоректна кількість товару' }, { status: 400 });
      }

      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) {
        return NextResponse.json({ success: false, error: 'Товар не знайдено в каталозі' }, { status: 400 });
      }

      const variants = Array.isArray(dbProduct.product_variants) ? dbProduct.product_variants : [];
      const matchedVariant = variants.find(
        (v: { color?: string; size?: string; price?: number }) =>
          (!item.color || v.color === item.color) && (!item.size || v.size === item.size)
      );

      const unitPrice =
        matchedVariant && typeof matchedVariant.price === 'number' && matchedVariant.price > 0
          ? matchedVariant.price
          : Number(dbProduct.base_price) || 0;

      let brandingPrice = 0;
      let verifiedBranding = undefined;

      if (item.branding?.enabled) {
        brandingPrice = calculateBrandingPrice(
          item.branding.placement,
          item.branding.size,
          item.branding.method
        );
        verifiedBranding = {
          ...item.branding,
          price: brandingPrice,
        };

        brandingDetails.push({
          itemIndex: index,
          itemTitle: `${dbProduct.title} ${item.size && item.size !== 'One Size' ? item.size : ''}`.trim(),
          placement: item.branding.placement,
          size: item.branding.size,
          method: item.branding.method,
          price: brandingPrice,
          logoFileName: item.branding.logoFileName || 'logo.file',
        });
      }

      totalPrice += (unitPrice + brandingPrice) * quantity;
      totalItems += quantity;

      verifiedItems.push({
        id: item.id,
        productId: dbProduct.id,
        slug: dbProduct.slug,
        title: dbProduct.title,
        image: item.image ?? dbProduct.image_url,
        price: unitPrice,
        quantity,
        color: item.color || 'Standard',
        size: item.size || 'One Size',
        vendorArticle: dbProduct.vendor_article,
        ...(verifiedBranding ? { branding: verifiedBranding } : {}),
      });
    }

    const { data: logs } = await supabaseAdmin
      .from('loyalty_logs')
      .select('amount, type')
      .eq('user_id', user.id);

    const userBalance = logs
      ? logs.reduce((acc, log) => acc + (log.type === 'earn' ? log.amount : -log.amount), 0)
      : 0;

    const userEmail = user.email || String(delivery.email || '');

    const { data: pastOrders } = await supabaseAdmin
      .from('orders')
      .select('total_price')
      .eq('user_email', userEmail);

    const totalSpent = pastOrders
      ? pastOrders.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0)
      : 0;

    const maxWriteOff = calculateMaxWriteOff(totalPrice, totalItems, Math.max(0, userBalance));
    const bonusesToUse = Math.max(0, Math.min(Math.floor(requestedBonuses), maxWriteOff));
    const payAmount = Math.max(0, totalPrice - bonusesToUse);
    const userTier = getCurrentTier(totalSpent);
    const earnedCashback = calculateCashback(payAmount, userTier.percent);

    const hasBranding = brandingDetails.length > 0;

    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([
        {
          user_id: user.id,
          user_email: userEmail,
          total_price: totalPrice,
          discount_bonuses: bonusesToUse,
          final_price: payAmount,
          items: verifiedItems,
          has_branding: hasBranding,
          branding_details: hasBranding ? brandingDetails : null,
          delivery_data: {
            city: String(delivery.city || ''),
            cityRef: String(delivery.cityRef || ''),
            warehouse: String(delivery.warehouse || ''),
            payment: String(delivery.payment || 'invoice'),
            comment: String(delivery.comment || ''),
            fullName: String(delivery.fullName || ''),
            phone: String(delivery.phone || ''),
            company: String(delivery.company || ''),
            edrpou: String(delivery.edrpou || ''),
          },
          status: 'new',
        },
      ])
      .select()
      .single();

    if (orderError || !newOrder) {
      return NextResponse.json(
        { success: false, error: orderError?.message || 'Помилка створення замовлення' },
        { status: 500 }
      );
    }

    if (bonusesToUse > 0) {
      await supabaseAdmin.from('loyalty_logs').insert({
        user_id: user.id,
        amount: bonusesToUse,
        description: `Оплата замовлення #${newOrder.id}`,
        type: 'spend',
      });
    }

    if (earnedCashback > 0) {
      await supabaseAdmin.from('loyalty_logs').insert({
        user_id: user.id,
        amount: earnedCashback,
        description: `Кешбек за замовлення #${newOrder.id} (${userTier.percent}%)`,
        type: 'earn',
      });
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
      totalPrice,
      bonusesToUse,
      payAmount,
      earnedCashback,
      items: verifiedItems,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Order creation error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
