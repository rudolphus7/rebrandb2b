'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Search, 
  Eye, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Truck 
} from 'lucide-react';
import Link from 'next/link';

// Тип замовлення
interface Order {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  user_email: string;
  delivery_data: any; // JSONB
  items: any[]; // JSONB
}

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  }

  // Фільтрація замовлень
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(search.toLowerCase()) ||
    order.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs flex items-center gap-1"><Clock size={12}/> Новий</span>;
      case 'completed': return <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs flex items-center gap-1"><CheckCircle size={12}/> Виконано</span>;
      case 'cancelled': return <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs flex items-center gap-1"><XCircle size={12}/> Скасовано</span>;
      case 'shipped': return <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs flex items-center gap-1"><Truck size={12}/> Відправлено</span>;
      default: return <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">{status}</span>;
    }
  };

  return (
    <div className="text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Замовлення</h1>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Пошук за ID або Email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none w-64"
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-500"/>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#222] text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">ID Замовлення</th>
                <th className="p-4 font-bold">Дата</th>
                <th className="p-4 font-bold">Клієнт</th>
                <th className="p-4 font-bold">Сума</th>
                <th className="p-4 font-bold">Статус</th>
                <th className="p-4 font-bold text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500"><Loader2 className="animate-spin mx-auto"/></td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Замовлень не знайдено</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition">
                    <td className="p-4 font-mono text-blue-400">#{order.id.slice(0, 8)}...</td>
                    <td className="p-4 text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="p-4">{order.user_email}</td>
                    <td className="p-4 font-bold">{order.total_price} грн</td>
                    <td className="p-4">{getStatusBadge(order.status)}</td>
                    <td className="p-4 text-right">
                       {/* Поки що просто кнопка, пізніше зробимо сторінку деталей */}
                       <button className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white">
                         <Eye size={18}/>
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}