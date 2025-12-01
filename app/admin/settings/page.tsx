"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Save, Globe, Phone, Mail, Instagram, Send, 
  Settings as SettingsIcon, AlertTriangle, CheckCircle, Loader2, UserPlus 
} from "lucide-react";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    site_name: "",
    site_description: "",
    contact_phone: "",
    contact_email: "",
    social_instagram: "",
    social_telegram: "",
    currency_rate: 1.0,
    maintenance_mode: false,
    registration_open: true // Додано нове налаштування
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    // Беремо єдиний запис з ID=1
    const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .single();

    if (data) {
        setFormData({
            site_name: data.site_name || "",
            site_description: data.site_description || "",
            contact_phone: data.contact_phone || "",
            contact_email: data.contact_email || "",
            social_instagram: data.social_instagram || "",
            social_telegram: data.social_telegram || "",
            currency_rate: data.currency_rate || 1.0,
            maintenance_mode: data.maintenance_mode || false,
            registration_open: data.registration_open ?? true // Зчитуємо з бази (або true якщо null)
        });
    } else if (error) {
        console.error("Error fetching settings:", error);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
        .from("site_settings")
        .update(formData)
        .eq("id", 1);

    if (error) {
        alert("Помилка збереження: " + error.message);
    } else {
        alert("Налаштування успішно оновлено!");
    }
    setSaving(false);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Завантаження налаштувань...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold">Налаштування магазину</h1>
            <p className="text-gray-400 text-sm mt-1">Керуйте глобальними параметрами сайту</p>
        </div>
        <button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
        >
            {saving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>}
            Зберегти зміни
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* ЗАГАЛЬНІ */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Globe size={20} className="text-blue-400"/> Загальна інформація</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Назва магазину</label>
                    <input 
                        type="text" name="site_name" 
                        className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-bold"
                        value={formData.site_name} onChange={handleChange}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Опис (SEO)</label>
                    <input 
                        type="text" name="site_description" 
                        className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        value={formData.site_description} onChange={handleChange}
                    />
                </div>
            </div>
        </div>

        {/* КОНТАКТИ */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Phone size={20} className="text-green-400"/> Контакти</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Телефон</label>
                    <div className="relative">
                        <Phone size={16} className="absolute left-3 top-3.5 text-gray-500"/>
                        <input 
                            type="text" name="contact_phone" 
                            className="w-full bg-[#222] border border-white/10 rounded-lg py-3 pl-10 pr-3 text-white focus:border-blue-500 outline-none"
                            value={formData.contact_phone} onChange={handleChange}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-3 top-3.5 text-gray-500"/>
                        <input 
                            type="email" name="contact_email" 
                            className="w-full bg-[#222] border border-white/10 rounded-lg py-3 pl-10 pr-3 text-white focus:border-blue-500 outline-none"
                            value={formData.contact_email} onChange={handleChange}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Instagram URL</label>
                    <div className="relative">
                        <Instagram size={16} className="absolute left-3 top-3.5 text-pink-500"/>
                        <input 
                            type="text" name="social_instagram" placeholder="https://instagram.com/..."
                            className="w-full bg-[#222] border border-white/10 rounded-lg py-3 pl-10 pr-3 text-white focus:border-blue-500 outline-none"
                            value={formData.social_instagram} onChange={handleChange}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Telegram URL</label>
                    <div className="relative">
                        <Send size={16} className="absolute left-3 top-3.5 text-blue-400"/>
                        <input 
                            type="text" name="social_telegram" placeholder="https://t.me/..."
                            className="w-full bg-[#222] border border-white/10 rounded-lg py-3 pl-10 pr-3 text-white focus:border-blue-500 outline-none"
                            value={formData.social_telegram} onChange={handleChange}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* ТЕХНІЧНІ */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><SettingsIcon size={20} className="text-yellow-400"/> Технічні параметри</h3>
            
            {/* Реєстрація */}
            <div className="flex items-center justify-between bg-[#222] p-4 rounded-xl border border-white/5 mb-4">
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${formData.registration_open ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-white mb-1">Реєстрація нових користувачів</div>
                        <div className="text-xs text-gray-400">Дозволити новим клієнтам створювати акаунти.</div>
                    </div>
                </div>
                <div 
                    onClick={() => setFormData({...formData, registration_open: !formData.registration_open})}
                    className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.registration_open ? "bg-green-500" : "bg-gray-700"}`}
                >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${formData.registration_open ? "translate-x-6" : "translate-x-0"}`}></div>
                </div>
            </div>

            {/* Режим обслуговування */}
            <div className="flex items-center justify-between bg-[#222] p-4 rounded-xl border border-white/5 mb-4">
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${formData.maintenance_mode ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-700/50 text-gray-400"}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-white mb-1">Режим обслуговування</div>
                        <div className="text-xs text-gray-400">Якщо увімкнути, сайт буде недоступний для клієнтів.</div>
                    </div>
                </div>
                <div 
                    onClick={() => setFormData({...formData, maintenance_mode: !formData.maintenance_mode})}
                    className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.maintenance_mode ? "bg-yellow-500" : "bg-gray-700"}`}
                >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${formData.maintenance_mode ? "translate-x-6" : "translate-x-0"}`}></div>
                </div>
            </div>

            {formData.maintenance_mode && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl flex gap-3 items-start text-yellow-200 text-sm">
                    <AlertTriangle size={20} className="flex-shrink-0 mt-0.5"/>
                    <p>Увага! Сайт зараз закритий для відвідувачів. Тільки адміністратори можуть бачити контент.</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}