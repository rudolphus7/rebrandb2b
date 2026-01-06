'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Package, User, MapPin, CreditCard, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function AdminOrderDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrder() {
            if (!id) return;

            // 1. Fetch Order Data
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', id)
                .single();

            if (orderError) {
                console.error('Error fetching order:', orderError);
                setLoading(false);
                return;
            }

            // 2. Fetch Order Items Manually
            const { data: itemsData, error: itemsError } = await supabase
                .from('order_items')
                .select(`
                  *,
                  product_id,
                  title,
                  quantity,
                  price
                `)
                .eq('order_id', id);

            if (itemsError) {
                // console.error('Error fetching items detail:', JSON.stringify(itemsError));
                // We won't block the whole page, but we should show this error
            }

            // 3. Fetch Product Details for Images (Manual Join)
            let enrichedItems: any[] = [];

            // A. Try using the fetched table items
            if (itemsData && itemsData.length > 0) {
                enrichedItems = itemsData;
            }
            // B. Fallback to orderData.items (JSONB) if table is empty
            else if (orderData.items && Array.isArray(orderData.items)) {
                // Map JSONB structure to standard structure
                enrichedItems = orderData.items.map((i: any) => ({
                    ...i,
                    product_id: i.productId || i.id, // Depending on how cart saves it
                    price: i.price,
                    quantity: i.quantity,
                    title: i.title
                }));
            }

            if (enrichedItems.length > 0) {
                const productIds = enrichedItems.map((i: any) => i.product_id || i.id).filter(Boolean);

                if (productIds.length > 0) {
                    const { data: products } = await supabase
                        .from('products')
                        .select('id, title, image_url, vendor_article')
                        .in('id', productIds);

                    const productMap = (products || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});

                    enrichedItems = enrichedItems.map((item: any) => ({
                        ...item,
                        product: productMap[item.product_id || item.id] || null
                    }));
                }
            }

            setOrder({ ...orderData, order_items: enrichedItems });
            setLoading(false);
        }
        fetchOrder();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Завантаження...</div>;
    if (!order) return <div className="p-10 text-center">Замовлення не знайдено</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <Link href="/admin/orders" className="flex items-center gap-2 text-gray-500 hover:text-blue-500 mb-6 transition w-fit">
                <ArrowLeft size={20} /> Назад до списку
            </Link>

            <div className="flex flex-col md:flex-row gap-6 mb-8 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        Замовлення #{String(order.id).slice(0, 8)}
                        <span className={`text-sm px-3 py-1 rounded-full uppercase tracking-wider ${order.status === 'new' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                            }`}>
                            {order.status}
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-2 flex items-center gap-4">
                        <span className="flex items-center gap-1"><Calendar size={16} /> {new Date(order.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock size={16} /> {new Date(order.created_at).toLocaleTimeString()}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: ITEMS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#222] font-bold flex items-center gap-2">
                            <Package size={20} className="text-blue-500" /> Товари ({order.order_items?.length || 0})
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                            {order.order_items?.map((item: any, idx: number) => (
                                <div key={`${item.id || 'item'}-${idx}`} className="p-4 flex gap-4 min-h-[100px]">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-black rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-white/5">
                                        {(item.product?.image_url || item.image_url || item.image) ? (
                                            <img
                                                src={item.product?.image_url || item.image_url || item.image}
                                                className="w-full h-full object-cover"
                                                alt={item.product?.title || item.title || 'Product'}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-1">No Img</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2">{item.product?.title || item.title}</h3>
                                        <p className="text-sm text-gray-500 mb-2">Арт: {item.product?.vendor_article || item.vendorArticle || 'N/A'}</p>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                                {item.quantity} шт
                                            </span>
                                            <span>x</span>
                                            <span className="font-bold">{item.price} грн</span>
                                        </div>
                                    </div>
                                    <div className="font-bold text-lg text-right">
                                        {item.price * item.quantity} грн
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* TOTALS & BONUSES */}
                        <div className="p-4 bg-gray-50 dark:bg-[#222] border-t border-gray-200 dark:border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-gray-500">
                                <span>Сума товарів:</span>
                                <span>{order.total_price} грн</span>
                            </div>
                            {order.discount_bonuses > 0 && (
                                <div className="flex justify-between items-center text-yellow-600 dark:text-yellow-400">
                                    <span>Списано бонусів:</span>
                                    <span>- {order.discount_bonuses} грн</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-gray-200 dark:border-white/10">
                                <span>До сплати:</span>
                                <span className="text-2xl text-blue-600 dark:text-blue-400">{order.final_price || order.total_price} грн</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: INFO */}
                <div className="space-y-6">

                    {/* USER INFO */}
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#222] font-bold flex items-center gap-2">
                            <User size={20} className="text-purple-500" /> Клієнт
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-bold">ПІБ / Компанія</span>
                                <p className="font-medium text-gray-900 dark:text-white">{order.delivery_data?.fullName || 'Гість'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-bold">Email</span>
                                <p className="font-medium text-gray-900 dark:text-white">{order.user_email || '-'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-bold">Телефон</span>
                                <p className="font-medium text-gray-900 dark:text-white">{order.delivery_data?.phone || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* DELIVERY INFO */}
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#222] font-bold flex items-center gap-2">
                            <MapPin size={20} className="text-orange-500" /> Доставка
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-bold">Спосіб</span>
                                <p className="font-medium text-gray-900 dark:text-white">{order.delivery_data?.method === 'nova' ? 'Нова Пошта' : 'Самовивіз'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-bold">Адреса / Відділення</span>
                                <p className="font-medium text-gray-900 dark:text-white">{order.delivery_data?.city || '-'}, {order.delivery_data?.warehouse || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* PAYMENT INFO */}
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#222] font-bold flex items-center gap-2">
                            <CreditCard size={20} className="text-green-500" /> Оплата
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-bold">Метод</span>
                                <p className="font-medium text-gray-900 dark:text-white">{order.payment_method === 'card' ? 'Карткою онлайн' : 'Післяплата'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 uppercase font-bold">Коментар</span>
                                <p className="font-medium text-gray-900 dark:text-white italic">"{order.comment || 'Без коментаря'}"</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
