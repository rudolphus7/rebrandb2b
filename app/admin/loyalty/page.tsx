"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Search, Gift, TrendingUp, TrendingDown, User, 
  MoreHorizontal, X, Plus, Minus, Save, History
} from "lucide-react";
import { format } from "date-fns";

// Рівні (ті самі, що і на фронті)
const TIERS = [
  { name: "Silver", min: 0, color: "text-gray-400" },
  { name: "Gold", min: 1000, color: "text-yellow-400" },
  { name: "Platinum", min: 5000, color: "text-cyan-400" }
];

export default function AdminLoyalty() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Стан для модального вікна
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [actionType, setActionType] = useState<"earn" | "spend">("earn");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // 1. Отримуємо профілі
    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        setLoading(false);
        return;
    }

    // 2. Отримуємо всю історію балів для розрахунку актуального балансу
    const { data: logs, error: logsError } = await supabase
        .from("loyalty_logs")
        .select("*");

    if (logsError) console.error("Error fetching logs:", logsError);

    // 3. Об'єднуємо дані
    const usersWithPoints = profiles.map(profile => {
        const userLogs = logs?.filter(log => log.user_id === profile.id) || [];
        
        const calculatedPoints = userLogs.reduce((acc: number, log: any) => {
            return acc + (log.type === 'earn' ? log.amount : -log.amount);
        }, 0);

        // Визначаємо рівень
        let currentTier = "Silver";
        if (calculatedPoints >= 5000) currentTier = "Platinum";
        else if (calculatedPoints >= 1000) currentTier = "Gold";

        return {
            ...profile,
            balance: calculatedPoints,
            tier: currentTier,
            logs: userLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Сортуємо логи від нових до старих
        };
    });

    setUsers(usersWithPoints);
    setLoading(false);
  }

  const handleTransaction = async () => {
      if (!amount || !description) return alert("Заповніть суму та опис!");
      setIsProcessing(true);

      const points = parseInt(amount);
      
      // Записуємо в лог
      const { error } = await supabase.from("loyalty_logs").insert({
          user_id: selectedUser.id,
          amount: points,
          description: description,
          type: actionType
      });

      if (error) {
          alert("Помилка: " + error.message);
      } else {
          // Оновлюємо поле в профілі (для швидкого доступу, хоча ми рахуємо динамічно)
          const newBalance = actionType === 'earn' 
            ? selectedUser.balance + points 
            : selectedUser.balance - points;

          await supabase.from("profiles").update({ bonus_points: newBalance }).eq("id", selectedUser.id);
          
          closeModal();
          fetchData(); // Оновлюємо список
      }
      setIsProcessing(false);
  };

  const closeModal = () => {
      setSelectedUser(null);
      setAmount("");
      setDescription("");
      setActionType("earn");
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || "").includes(search)
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Програма лояльності</h1>
        <p className="text-gray-400">Керування бонусами клієнтів та нарахуваннями.</p>
      </div>

      {/* ПОШУК */}
      <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 mb-6">
         <div className="relative max-w-md">
            <input 
                type="text" 
                placeholder="Пошук клієнта за ім'ям або телефоном..." 
                className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-blue-500 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-3 text-gray-500"/>
         </div>
      </div>

      {/* ТАБЛИЦЯ КЛІЄНТІВ */}
      <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-[#222] text-gray-400 uppercase text-xs">
                    <tr>
                        <th className="p-4">Клієнт</th>
                        <th className="p-4">Контакти</th>
                        <th className="p-4 text-center">Рівень</th>
                        <th className="p-4 text-right">Баланс</th>
                        <th className="p-4 text-right">Дії</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {loading ? (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">Завантаження...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">Клієнтів не знайдено</td></tr>
                    ) : (
                        filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-white/5 transition group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-lg font-bold text-gray-500">
                                            {user.full_name ? user.full_name[0] : <User size={18}/>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{user.full_name || "Без імені"}</div>
                                            <div className="text-xs text-gray-500">{user.company_name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-300">
                                    <div>{user.phone || "-"}</div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`font-bold uppercase text-xs tracking-wider ${TIERS.find(t => t.name === user.tier)?.color}`}>
                                        {user.tier}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="font-mono font-bold text-lg text-white">{user.balance} pts</div>
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => setSelectedUser(user)}
                                        className="bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 px-4 py-2 rounded-lg text-xs font-bold transition border border-blue-900/50"
                                    >
                                        Керувати
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* МОДАЛЬНЕ ВІКНО КЕРУВАННЯ */}
      {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#222]">
                      <div>
                          <h2 className="text-xl font-bold text-white">{selectedUser.full_name || "Клієнт"}</h2>
                          <p className="text-sm text-gray-400">Поточний баланс: <span className="text-white font-bold">{selectedUser.balance} pts</span></p>
                      </div>
                      <button onClick={closeModal}><X className="text-gray-500 hover:text-white"/></button>
                  </div>

                  <div className="p-6 space-y-6">
                      
                      {/* Вибір дії */}
                      <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => setActionType("earn")}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${actionType === "earn" ? "bg-green-900/20 border-green-500 text-green-400" : "bg-black border-white/10 text-gray-500 hover:border-white/30"}`}
                          >
                              <Plus size={24}/>
                              <span className="font-bold">Нарахувати</span>
                          </button>
                          <button 
                            onClick={() => setActionType("spend")}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${actionType === "spend" ? "bg-red-900/20 border-red-500 text-red-400" : "bg-black border-white/10 text-gray-500 hover:border-white/30"}`}
                          >
                              <Minus size={24}/>
                              <span className="font-bold">Списати</span>
                          </button>
                      </div>

                      {/* Поля вводу */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Сума бонусів</label>
                          <input 
                            type="number" 
                            autoFocus
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl p-4 text-2xl font-mono font-bold text-white outline-none focus:border-blue-500"
                            placeholder="0"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Коментар (обов'язково)</label>
                          <input 
                            type="text" 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                            placeholder={actionType === 'earn' ? "Подарунок до ДН, Кешбек за замовлення..." : "Оплата замовлення, Коригування..."}
                          />
                      </div>

                      <button 
                        onClick={handleTransaction}
                        disabled={isProcessing}
                        className={`w-full py-4 rounded-xl font-bold text-black transition flex items-center justify-center gap-2 disabled:opacity-50 ${actionType === 'earn' ? "bg-green-500 hover:bg-green-400" : "bg-red-500 hover:bg-red-400"}`}
                      >
                          {isProcessing ? "Обробка..." : (actionType === 'earn' ? "Нарахувати бонуси" : "Списати бонуси")}
                      </button>

                      {/* Історія останніх дій цього юзера */}
                      <div className="pt-6 border-t border-white/10">
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><History size={14}/> Останні транзакції</h4>
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                              {selectedUser.logs.length > 0 ? (
                                  selectedUser.logs.map((log: any) => (
                                      <div key={log.id} className="flex justify-between text-xs bg-[#222] p-2 rounded">
                                          <span className="text-gray-300">{log.description}</span>
                                          <span className={log.type === 'earn' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                              {log.type === 'earn' ? '+' : '-'}{log.amount}
                                          </span>
                                      </div>
                                  ))
                              ) : (
                                  <p className="text-gray-600 text-xs text-center">Історія порожня</p>
                              )}
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      )}
    </div>
  );
}