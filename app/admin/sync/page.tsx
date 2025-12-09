'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminSyncPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const runSync = async (supplier: string) => {
    setLoading(true);
    addLog(`🚀 Починаємо синхронізацію: ${supplier}...`);
    
    try {
      const res = await fetch(`/api/sync?supplier=${supplier}`);
      const data = await res.json();
      
      if (data.success) {
        addLog(`✅ ${supplier}: Успішно! Оброблено груп товарів: ${data.results[0]?.processed}`);
      } else {
        addLog(`❌ ${supplier}: Помилка - ${data.error}`);
      }
    } catch (e: any) {
      addLog(`❌ Критична помилка: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  return (
    <div className="p-8 text-white max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <RefreshCw size={32} className="text-blue-500"/> 
        Синхронізація товарів
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* TOTOBI CARD */}
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-bold mb-2">Totobi</h3>
                <p className="text-gray-400 text-sm mb-4">Імпорт товарів з YML прайсу. Групування за назвою.</p>
            </div>
            <button 
                onClick={() => runSync('Totobi')} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin"/> : 'Запустити Totobi'}
            </button>
        </div>

        {/* TOPTIME CARD */}
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 flex flex-col justify-between">
             <div>
                <h3 className="text-xl font-bold mb-2">TopTime</h3>
                <p className="text-gray-400 text-sm mb-4">Імпорт з XML. Групування за артикулом моделі.</p>
             </div>
            <button 
                onClick={() => runSync('TopTime')} 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin"/> : 'Запустити TopTime'}
            </button>
        </div>
      </div>

      {/* ЛОГИ */}
      <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-sm h-64 overflow-y-auto">
        <p className="text-gray-500 border-b border-white/10 pb-2 mb-2">Лог операцій:</p>
        {logs.length === 0 && <span className="text-gray-600">Очікування дій...</span>}
        {logs.map((log, i) => (
            <div key={i} className={`mb-1 ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-gray-300'}`}>
                {log}
            </div>
        ))}
      </div>
    </div>
  );
}