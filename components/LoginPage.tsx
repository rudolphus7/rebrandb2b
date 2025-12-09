"use client";

import { useState, useEffect } from "react";
import { motion, useMotionTemplate, useMotionValue, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, User, Hexagon, Building2, FileText, Phone, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage({ onLogin }: { onLogin: (e: any, p: any) => void }) {
  // Режими
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registrationAllowed, setRegistrationAllowed] = useState(true);

  // Дані форми
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Додаткові поля для реєстрації B2B
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [edrpou, setEdrpou] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Ефект мишки (прожектор)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  // Перевірка чи відкрита реєстрація (з адмінки)
  useEffect(() => {
    async function checkSettings() {
        const { data } = await supabase.from('site_settings').select('registration_open').single();
        if (data) {
            setRegistrationAllowed(data.registration_open ?? true);
        }
    }
    checkSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (mode === "login") {
        // --- ЛОГІКА ВХОДУ ---
        await onLogin(email, password);
        setIsLoading(false);
    } else {
        // --- ЛОГІКА РЕЄСТРАЦІЇ ---
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    // Ці дані полетять в базу через тригер handle_new_user
                    data: {
                        full_name: fullName,
                        company_name: companyName,
                        edrpou: edrpou,
                        phone: phone
                    }
                }
            });

            if (error) throw error;

            setSuccessMsg("Реєстрація успішна! Перевірте пошту для підтвердження або увійдіть, якщо підтвердження не потрібне.");
            
            // Автоматично перемикаємо на вхід через 2 сек
            setTimeout(() => {
                setMode("login");
                setSuccessMsg("");
            }, 3000);

        } catch (error: any) {
            setErrorMsg(error.message || "Помилка реєстрації");
        } finally {
            setIsLoading(false);
        }
    }
  };

  return (
    <div 
      className="group relative min-h-screen flex items-center justify-center bg-black overflow-hidden selection:bg-blue-500/30"
      onMouseMove={handleMouseMove}
    >
      {/* СІТКА */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808015_1px,transparent_1px),linear-gradient(to_bottom,#80808015_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* ПРОЖЕКТОР */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(59, 130, 246, 0.10),
              transparent 80%
            )
          `,
        }}
      />

      {/* КАРТКА */}
      <div className="relative z-10 w-full max-w-md p-4">
        
        <div className="flex justify-center mb-6">
          <div className="relative">
              <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 animate-pulse"></div>
              <Hexagon className="relative w-14 h-14 text-white stroke-[1.5]" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-lg tracking-tighter text-white">R</span>
          </div>
        </div>

        <motion.div 
            layout
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#0f0f0f]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent opacity-70"></div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">REBRAND B2B</h1>
            <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">
                {mode === "login" ? "Вхід до порталу" : "Реєстрація партнера"}
            </p>
          </div>

          {errorMsg && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center gap-2 text-red-200 text-xs">
                  <AlertCircle size={16}/> {errorMsg}
              </div>
          )}

          {successMsg && (
              <div className="mb-4 p-3 bg-green-900/20 border border-green-900/50 rounded-lg flex items-center gap-2 text-green-200 text-xs">
                  <CheckCircle size={16}/> {successMsg}
              </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <AnimatePresence mode="popLayout">
                {mode === "register" && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                    >
                        <InputField icon={User} type="text" placeholder="ПІБ Представника" value={fullName} onChange={setFullName} required />
                        <InputField icon={Building2} type="text" placeholder="Назва Компанії" value={companyName} onChange={setCompanyName} required />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField icon={FileText} type="text" placeholder="ЄДРПОУ" value={edrpou} onChange={setEdrpou} required />
                            <InputField icon={Phone} type="tel" placeholder="Телефон" value={phone} onChange={setPhone} required />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <InputField icon={User} type="email" placeholder="Email (Логін)" value={email} onChange={setEmail} required />
            <InputField icon={Lock} type="password" placeholder="Пароль" value={password} onChange={setPassword} required />

            <button 
              disabled={isLoading}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors mt-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]"
            >
              <span>{isLoading ? "Обробка..." : (mode === "login" ? "Увійти" : "Зареєструватись")}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* ПЕРЕМИКАЧ */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            {mode === "login" ? (
                <div className="text-sm text-zinc-500">
                    Ще не маєте акаунту?{" "}
                    {registrationAllowed ? (
                        <button onClick={() => setMode("register")} className="text-blue-400 hover:text-blue-300 font-bold transition">
                            Стати партнером
                        </button>
                    ) : (
                        <span className="text-zinc-600 cursor-not-allowed" title="Реєстрація тимчасово закрита адміністратором">
                            Реєстрація закрита
                        </span>
                    )}
                </div>
            ) : (
                <div className="text-sm text-zinc-500">
                    Вже є акаунт?{" "}
                    <button onClick={() => setMode("login")} className="text-blue-400 hover:text-blue-300 font-bold transition">
                        Увійти
                    </button>
                </div>
            )}
          </div>

        </motion.div>

        <p className="text-center text-zinc-700 text-[10px] mt-8 font-mono">
          REBRAND STUDIO B2B v2.1 • SECURITY ENCRYPTED
        </p>
      </div>
    </div>
  );
}

// Допоміжний компонент для полів
function InputField({ icon: Icon, ...props }: any) {
    return (
        <div className="relative group/input">
            <Icon className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5 transition group-focus-within/input:text-blue-500" />
            <input 
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:bg-black/60 transition-all text-sm"
                {...props}
                onChange={(e) => props.onChange(e.target.value)}
            />
        </div>
    )
}