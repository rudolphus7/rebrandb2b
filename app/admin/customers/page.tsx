"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Search, CheckCircle, XCircle, User, Building2, 
  FileText, Phone, Mail, Calendar, ShieldAlert, Lock 
} from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

// --- ВАЖЛИВО: Впишіть сюди свій email ---
const ADMIN_EMAIL = "rebrand.com.ua@gmail.com"; // Замініть на вашу пошту!

export default function AdminCustomers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

  useEffect(() => {
    // 1. Дізнаємося, хто зараз залогінений
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
            setCurrentUserEmail(session.user.email);
        }
    });

    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching users:", error);
    setUsers(data || []);
    setLoading(false);
  }

  const toggleVerification = async (id: string, currentStatus: boolean) => {
    // Додаткова перевірка на фронтенді
    if (currentUserEmail !== ADMIN_EMAIL) {
        alert("У вас немає прав для виконання цієї дії.");
        return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: !currentStatus })
      .eq("id", id);

    if (error) {
      alert("Помилка (перевірте права доступу): " + error.message);
    } else {
      setUsers(users.map(u => u.id === id ? { ...u, is_verified: !currentStatus } : u));
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.edrpou || "").includes(search)
  );

  // Перевірка прав для UI
  const isSuperAdmin = currentUserEmail === ADMIN_EMAIL;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold">Клієнти (B2B)</h1>
            <p className="text-gray-400 text-sm mt-1">Перевірка та активація партнерських акаунтів</p>
        </div>
        <div className="flex items-center gap-4">
            {!isSuperAdmin && (
                <div className="bg-red-900/20 border border-red-500/50 px-4 py-2 rounded-xl text-red-200 text-xs flex items-center gap-2">
                    <Lock size={14}/> Ви в режимі перегляду (не Адмін)
                </div>
            )}
            <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl border border-white/10 text-sm flex gap-2">
                <span className="text-gray-400">Всього:</span>
                <span className="text-white font-bold">{users.length}</span>
            </div>
        </div>
      </div>

      {/* ПОШУК */}
      <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 mb-6">
         <div className="relative max-w-md">
            <input 
                type="text" 
                placeholder="Пошук за Компанією, ЄДРПОУ або Ім'ям..." 
                className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-blue-500 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-3 text-gray-500"/>
         </div>
      </div>

      {/* ТАБЛИЦЯ */}
      <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-[#222] text-gray-400 uppercase text-xs">
                    <tr>
                        <th className="p-4">Компанія / ЄДРПОУ</th>
                        <th className="p-4">Представник</th>
                        <th className="p-4">Контакти</th>
                        <th className="p-4">Дата реєстрації</th>
                        <th className="p-4 text-center">Статус</th>
                        <th className="p-4 text-right">Дія</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">Завантаження...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">Клієнтів не знайдено</td></tr>
                    ) : (
                        filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-white/5 transition group">
                                <td className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-900/20 text-blue-400 rounded-lg">
                                            <Building2 size={20}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-base">{user.company_name || "Приватна особа"}</div>
                                            <div className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-1">
                                                <FileText size={10}/> {user.edrpou || "Не вказано"}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-white">
                                        <User size={16} className="text-gray-500"/> {user.full_name || "Без імені"}
                                    </div>
                                </td>
                                <td className="p-4 text-gray-300 space-y-1">
                                    <div className="flex items-center gap-2 text-xs"><Phone size={12}/> {user.phone || "-"}</div>
                                </td>
                                <td className="p-4 text-gray-500 text-xs">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={12}/>
                                        {user.created_at ? format(new Date(user.created_at), 'd MMM yyyy', { locale: uk }) : '-'}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    {user.is_verified ? (
                                        <span className="inline-flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold border border-green-900/50">
                                            <CheckCircle size={12}/> Активний
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded text-xs font-bold border border-yellow-900/50">
                                            <ShieldAlert size={12}/> Очікує
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => toggleVerification(user.id, user.is_verified)}
                                        disabled={!isSuperAdmin} // Блокуємо кнопку, якщо не адмін
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition border ${
                                            !isSuperAdmin
                                            ? "bg-gray-800 text-gray-500 cursor-not-allowed border-transparent"
                                            : user.is_verified 
                                                ? "bg-red-900/10 text-red-400 border-red-900/30 hover:bg-red-900/30" 
                                                : "bg-green-600 text-white border-transparent hover:bg-green-500"
                                        }`}
                                        title={!isSuperAdmin ? "Тільки головний адміністратор може це робити" : ""}
                                    >
                                        {user.is_verified ? "Заблокувати" : "Активувати"}
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