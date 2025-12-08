"use client";

import { useState } from "react";
import { 
  UploadCloud, CheckCircle, Clock, 
  Loader2, Euro, ShoppingCart, AlertCircle
} from "lucide-react";

export default function AdminSync() {
  const [activeProvider, setActiveProvider] = useState<"totobi" | "toptime">("totobi");
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0 });
  const [syncStatus, setSyncStatus] = useState<string>("");
  
  const [totobiUrl, setTotobiUrl] = useState("https://totobi.com.ua/index.php?dispatch=yml.get&access_key=lg3bjy2gvww");
  const [toptimeUrl, setToptimeUrl] = useState("https://toptime.com.ua/xml/toptime.xml");
  const [eurRate, setEurRate] = useState(43.5);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Ініціалізація...");
    setSyncProgress({ processed: 0, total: 0 });

    try {
        let offset = 0;
        const limit = 50; 
        let done = false;
        let consecutiveErrors = 0;

        while (!done) {
            // Формуємо URL безпечно
            const apiUrl = new URL('/api/sync', window.location.href);
            apiUrl.searchParams.set('provider', activeProvider);
            apiUrl.searchParams.set('offset', String(offset || 0)); // 🔥 FIX: Захист від undefined
            apiUrl.searchParams.set('limit', String(limit));
            
            if (activeProvider === 'totobi') {
                apiUrl.searchParams.set('url', totobiUrl);
            } else {
                apiUrl.searchParams.set('url', toptimeUrl);
                apiUrl.searchParams.set('rate', String(eurRate || 43.5)); // 🔥 FIX
            }

            const res = await fetch(apiUrl.toString());
            
            // Якщо сервер впав (500), пробуємо розпарсити помилку або кидаємо загальну
            let data;
            try {
                data = await res.json();
            } catch (e) {
                console.error("JSON Parse error:", e);
                throw new Error(`Server returned ${res.status} ${res.statusText}`);
            }

            if (!res.ok || !data.success) {
                console.error("Sync Error:", data?.error);
                consecutiveErrors++;
                if (consecutiveErrors > 3) throw new Error(data?.error || "Too many errors");
                
                // Якщо помилка, але не критична, пробуємо пропустити батч (обережно)
                setSyncStatus(`Помилка батчу (спроба ${consecutiveErrors})...`);
                offset += limit; 
                continue;
            }

            // Скидаємо лічильник помилок при успіху
            consecutiveErrors = 0;

            if (data.done || (data.processed === 0 && offset > 0)) {
                done = true;
                setSyncStatus(`✅ Успішно! Оброблено моделей: ${data.total || syncProgress.processed}`);
                setSyncProgress({ processed: data.total || syncProgress.processed, total: data.total || syncProgress.processed });
            } else {
                // Оновлюємо прогрес
                const processedNow = (data.processed || 0) + offset;
                setSyncStatus(`Оброблено ~${processedNow}...`);
                setSyncProgress({ processed: processedNow, total: data.total || 0 });
                
                // 🔥 FIX: Якщо nextOffset не прийшов, рухаємось вручну
                offset = typeof data.nextOffset === 'number' ? data.nextOffset : offset + limit;
            }
        }

    } catch (error: any) {
        console.error(error);
        setSyncStatus(`❌ Помилка: ${error.message}`);
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Синхронізація складів</h1>
        <p className="text-gray-400">Створення карток товарів (1 модель = багато кольорів).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ЛІВА КОЛОНКА */}
        <div className="lg:col-span-4 space-y-4">
            <button 
                onClick={() => setActiveProvider("totobi")}
                className={`w-full p-5 rounded-2xl border text-left transition flex items-center gap-4 ${activeProvider === "totobi" ? "bg-blue-900/20 border-blue-500 ring-1 ring-blue-500" : "bg-[#1a1a1a] border-white/5 hover:border-white/20"}`}
            >
                <div className={`p-3 rounded-xl ${activeProvider === "totobi" ? "bg-blue-600 text-white" : "bg-[#222] text-gray-500"}`}><ShoppingCart size={24} /></div>
                <div>
                    <h3 className="font-bold text-white text-lg">Totobi</h3>
                    <p className="text-xs text-gray-500 mt-1">Одяг, YML Feed</p>
                </div>
            </button>

            <button 
                onClick={() => setActiveProvider("toptime")}
                className={`w-full p-5 rounded-2xl border text-left transition flex items-center gap-4 ${activeProvider === "toptime" ? "bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500" : "bg-[#1a1a1a] border-white/5 hover:border-white/20"}`}
            >
                <div className={`p-3 rounded-xl ${activeProvider === "toptime" ? "bg-emerald-600 text-white" : "bg-[#222] text-gray-500"}`}><Clock size={24} /></div>
                <div>
                    <h3 className="font-bold text-white text-lg">TopTime</h3>
                    <p className="text-xs text-gray-500 mt-1">Сувенірка, XML (EUR)</p>
                </div>
            </button>
        </div>

        {/* ПРАВА КОЛОНКА */}
        <div className="lg:col-span-8">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-8 min-h-[400px]">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
                    {activeProvider === 'totobi' ? <ShoppingCart className="text-blue-500" size={32}/> : <Clock className="text-emerald-500" size={32}/>}
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {activeProvider === 'totobi' ? 'Налаштування Totobi' : 'Налаштування TopTime'}
                        </h2>
                        <p className="text-sm text-gray-500">Система автоматично об'єднає кольори в одну картку</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">XML / YML Посилання</label>
                        <input 
                            type="text" 
                            value={activeProvider === 'totobi' ? totobiUrl : toptimeUrl}
                            onChange={(e) => activeProvider === 'totobi' ? setTotobiUrl(e.target.value) : setToptimeUrl(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 outline-none font-mono text-sm"
                        />
                    </div>

                    {activeProvider === 'toptime' && (
                        <div className="bg-[#111] p-4 rounded-xl border border-white/10 flex items-center gap-4">
                            <div className="p-2 bg-emerald-900/30 text-emerald-400 rounded-lg"><Euro size={20}/></div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase">Курс Євро (EUR)</label>
                                <input 
                                    type="number" 
                                    value={eurRate}
                                    onChange={(e) => setEurRate(parseFloat(e.target.value))}
                                    className="bg-transparent text-white font-bold text-lg outline-none w-full placeholder-gray-600"
                                    placeholder="43.5"
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        {isSyncing && (
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-4">
                                <div className="flex justify-between text-sm mb-2 text-white font-bold">
                                    <span>{syncStatus}</span>
                                </div>
                                <div className="w-full bg-black rounded-full h-2 overflow-hidden">
                                    <div className="bg-blue-500 h-2 rounded-full animate-pulse w-full"></div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={`
                                w-full py-4 px-8 rounded-xl font-bold flex items-center justify-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed
                                ${activeProvider === 'totobi' 
                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20" 
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"}
                            `}
                        >
                            {isSyncing ? <Loader2 className="animate-spin"/> : <UploadCloud />}
                            {isSyncing ? "Обробка..." : "Запустити імпорт"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}