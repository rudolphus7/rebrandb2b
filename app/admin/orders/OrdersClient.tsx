'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import Link from 'next/link';

// Інтерфейс пропсів (те, що ми передаємо з page.tsx)
interface OrdersClientProps {
  initialOrders: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default function OrdersClient({ initialOrders, totalCount, totalPages, currentPage }: OrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);

  // Функція оновлення URL при пошуку/пагінації
  const updateParams = (newParams: Record<string, string | number | null>) => {
    setLoading(true);
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') params.delete(key);
      else params.set(key, String(value));
    });

    router.push(`/admin/orders?${params.toString()}`);
    // Loading зніметься автоматично, коли Next.js замінить сторінку, 
    // але для візуального ефекту можна залишити, або скинути через useEffect
    setTimeout(() => setLoading(false), 500);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: search, page: 1 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs flex items-center gap-1 w-fit"><Clock size={12} /> Новий</span>;
      case 'completed': return <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs flex items-center gap-1 w-fit"><CheckCircle size={12} /> Виконано</span>;
      case 'cancelled': return <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs flex items-center gap-1 w-fit"><XCircle size={12} /> Скасовано</span>;
      case 'shipped': return <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs flex items-center gap-1 w-fit"><Truck size={12} /> Відправлено</span>;
      default: return <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs w-fit">{status}</span>;
    }
  };

  return (
    <div className="text-gray-900 dark:text-white transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Замовлення</h1>
          <p className="text-gray-400 text-sm mt-1">Всього замовлень: {totalCount}</p>
        </div>
      </div>

      {/* ПОШУК */}
      <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-200 dark:border-white/5 mb-6 flex gap-4 transition-colors duration-300">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Пошук за ID, Email або Телефоном..."
            className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-blue-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={18} className="absolute left-3 top-3 text-gray-500" />
        </form>
        <button className="p-2.5 bg-black border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/30 transition">
          <Filter size={20} />
        </button>
      </div>

      {/* ТАБЛИЦЯ */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#222] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-transparent">
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
                <tr><td colSpan={6} className="p-8 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" /></td></tr>
              ) : initialOrders.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Замовлень не знайдено</td></tr>
              ) : (
                initialOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-50 dark:hover:bg-white/5 transition border-b border-gray-100 dark:border-white/5 last:border-0">
                    <td className="p-4 font-mono text-blue-400 text-xs">#{String(order.id).slice(0, 8)}...</td>
                    <td className="p-4 text-gray-400">{new Date(order.created_at).toLocaleDateString()} <span className="text-xs">{new Date(order.created_at).toLocaleTimeString().slice(0, 5)}</span></td>
                    <td className="p-4">
                      <div className="font-bold">{order.delivery_data?.fullName || 'Гість'}</div>
                      <div className="text-xs text-gray-500">{order.user_email}</div>
                    </td>
                    <td className="p-4 font-bold">{order.final_price || order.total_price} грн</td>
                    <td className="p-4">{getStatusBadge(order.status)}</td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="inline-flex p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white">
                        <Eye size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ПАГІНАЦІЯ */}
        <div className="bg-gray-50 dark:bg-[#222] p-4 flex justify-between items-center border-t border-gray-200 dark:border-white/5 transition-colors">
          <button
            onClick={() => updateParams({ page: Math.max(1, currentPage - 1) })}
            disabled={currentPage === 1}
            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={16} /> Попередня
          </button>
          <span className="text-sm text-gray-500">Сторінка {currentPage} з {totalPages || 1}</span>
          <button
            onClick={() => updateParams({ page: Math.min(totalPages, currentPage + 1) })}
            disabled={currentPage === totalPages || totalPages === 0}
            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Наступна <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}