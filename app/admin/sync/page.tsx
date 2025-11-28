"use client";

import { useState } from "react";
import { 
  RefreshCw, FileSpreadsheet, Globe, Database, 
  UploadCloud, CheckCircle, AlertTriangle, Clock, 
  ArrowRight, FileCode, Settings, Loader2
} from "lucide-react";

export default function AdminSync() {
  const [activeTab, setActiveTab] = useState<"yml" | "excel" | "sheets" | "api">("yml");
  
  // Стан процесу синхронізації
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0 });
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [ymlUrl, setYmlUrl] = useState("https://totobi.com.ua/index.php?dispatch=yml.get&access_key=lg3bjy2gvww");

  // Mock logs
  const [logs, setLogs] = useState([
    { id: 1, type: "YML", status: "success", items: 1420, date: "28.11.2025 14:30", source: "totobi.com.ua" },
  ]);

  const handleYmlSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Початок завантаження...");
    setSyncProgress({ processed: 0, total: 0 });

    try {
        let offset = 0;
        const limit = 50; // Обробляємо по 50 товарів за раз, щоб не "покласти" сервер
        let done = false;

        while (!done) {
            const res = await fetch(`/api/sync?url=${encodeURIComponent(ymlUrl)}&offset=${offset}&limit=${limit}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Помилка сервера");

            if (data.done) {
                done = true;
                setSyncStatus("Завершено успішно!");
            } else {
                setSyncProgress({ processed: data.processed, total: data.total });
                setSyncStatus(`Оброблено ${data.processed} з ${data.total}...`);
                offset = data.nextOffset;
            }
        }

        // Додаємо успішний лог
        setLogs(prev => [{
            id: Date.now(),
            type: "YML",
            status: "success",
            items: syncProgress.total || offset, // приблизно
            date: new Date().toLocaleString(),
            source: new URL(ymlUrl).hostname
        }, ...prev]);

    } catch (error: any) {
        console.error(error);
        setSyncStatus("Помилка: " + error.message);
        alert("Помилка синхронізації: " + error.message);
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Синхронізація товарів</h1>
        <p className="text-gray-400">Керуйте імпортом товарів від постачальників та оновленням залишків.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === ЛІВА КОЛОНКА: ВИБІР МЕТОДУ === */}
        <div className="space-y-4">
            <button 
                onClick={() => setActiveTab("yml")}
                className={`w-full p-4 rounded-xl border text-left transition flex items-center gap-4 ${activeTab === "yml" ? "bg-blue-900/20 border-blue-500 ring-1 ring-blue-500" : "bg-[#1a1a1a] border-white/5 hover:border-white/20"}`}
            >
                <div className={`p-3 rounded-lg ${activeTab === "yml" ? "bg-blue-500 text-white" : "bg-[#222] text-gray-400"}`}><FileCode size={24} /></div>
                <div><h3 className="font-bold text-white">YML / XML Feed</h3><p className="text-xs text-gray-500 mt-1">Основний імпорт (Totobi)</p></div>
            </button>

            <button 
                onClick={() => setActiveTab("excel")}
                className={`w-full p-4 rounded-xl border text-left transition flex items-center gap-4 ${activeTab === "excel" ? "bg-green-900/20 border-green-500 ring-1 ring-green-500" : "bg-[#1a1a1a] border-white/5 hover:border-white/20"}`}
            >
                <div className={`p-3 rounded-lg ${activeTab === "excel" ? "bg-green-600 text-white" : "bg-[#222] text-gray-400"}`}><FileSpreadsheet size={24} /></div>
                <div><h3 className="font-bold text-white">Excel / CSV</h3><p className="text-xs text-gray-500 mt-1">Ручне завантаження</p></div>
            </button>

            <button 
                onClick={() => setActiveTab("api")}
                className={`w-full p-4 rounded-xl border text-left transition flex items-center gap-4 ${activeTab === "api" ? "bg-purple-900/20 border-purple-500 ring-1 ring-purple-500" : "bg-[#1a1a1a] border-white/5 hover:border-white/20"}`}
            >
                <div className={`p-3 rounded-lg ${activeTab === "api" ? "bg-purple-500 text-white" : "bg-[#222] text-gray-400"}`}><Database size={24} /></div>
                <div><h3 className="font-bold text-white">API & 1C</h3><p className="text-xs text-gray-500 mt-1">Налаштування Webhook</p></div>
            </button>
        </div>

        {/* === ПРАВА КОЛОНКА: НАЛАШТУВАННЯ === */}
        <div className="lg:col-span-2">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-8 mb-8 min-h-[300px]">
                
                {/* --- YML FORM --- */}
                {activeTab === "yml" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <FileCode className="text-blue-500" size={32}/>
                            <h2 className="text-2xl font-bold">Імпорт з YML/XML</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">Посилання на файл (URL)</label>
                                <input 
                                    type="text" 
                                    value={ymlUrl}
                                    onChange={(e) => setYmlUrl(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 outline-none font-mono"
                                />
                            </div>

                            <div className="flex flex-col gap-3 bg-[#222] p-4 rounded-xl border border-white/5">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 rounded bg-black border-white/20 text-blue-600 focus:ring-0" defaultChecked />
                                    <span className="text-sm text-gray-300">Оновлювати ціни та залишки</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 rounded bg-black border-white/20 text-blue-600 focus:ring-0" defaultChecked />
                                    <span className="text-sm text-gray-300">Створювати нові товари</span>
                                </label>
                            </div>

                            {isSyncing && (
                                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                                    <div className="flex justify-between text-sm mb-2 text-blue-300 font-bold">
                                        <span>Статус: {syncStatus}</span>
                                        <span>{syncProgress.processed} / {syncProgress.total}</span>
                                    </div>
                                    <div className="w-full bg-black rounded-full h-2.5">
                                        <div 
                                            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
                                            style={{ width: `${syncProgress.total ? (syncProgress.processed / syncProgress.total) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleYmlSync}
                                disabled={isSyncing}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl w-full flex items-center justify-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSyncing ? <Loader2 className="animate-spin"/> : <UploadCloud />}
                                {isSyncing ? "Синхронізація..." : "Запустити імпорт"}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- EXCEL FORM (Placeholder) --- */}
                {activeTab === "excel" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-center py-10">
                        <FileSpreadsheet size={48} className="mx-auto text-gray-600 mb-4"/>
                        <h3 className="text-xl font-bold text-gray-400">Імпорт з Excel</h3>
                        <p className="text-gray-600">Функціонал в розробці. Скористайтеся YML.</p>
                    </div>
                )}

                {/* --- API FORM (Info) --- */}
                {activeTab === "api" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <Database className="text-purple-500" size={32}/>
                            <h2 className="text-2xl font-bold">API Інтеграція</h2>
                        </div>
                        <div className="bg-[#222] p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Ваш Endpoint</p>
                            <code className="text-sm text-purple-400 font-mono break-all block bg-black p-3 rounded">POST /api/sync/webhook</code>
                        </div>
                    </div>
                )}

            </div>

            {/* --- LOGS --- */}
            <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock size={20}/> Історія синхронізацій</h3>
                <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#222] text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="p-4">Дата</th>
                                <th className="p-4">Тип</th>
                                <th className="p-4">Джерело</th>
                                <th className="p-4 text-center">Товарів</th>
                                <th className="p-4 text-right">Статус</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-white/5 transition">
                                    <td className="p-4 text-gray-300">{log.date}</td>
                                    <td className="p-4 font-bold text-white">{log.type}</td>
                                    <td className="p-4 text-gray-500 font-mono text-xs">{log.source}</td>
                                    <td className="p-4 text-center font-bold">{log.items}</td>
                                    <td className="p-4 text-right">
                                        <span className="inline-flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold border border-green-900/50">
                                            <CheckCircle size={12}/> Успіх
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}