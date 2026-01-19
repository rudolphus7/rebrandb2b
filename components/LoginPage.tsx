"use client";

import { useState, useEffect } from "react";
import { motion, useMotionTemplate, useMotionValue, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, User, Hexagon, Building2, FileText, Phone, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getReferralCookie } from "@/lib/referral";

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
        const refCode = getReferralCookie();

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Ці дані полетять в базу через тригер handle_new_user
            data: {
              full_name: fullName,
              company_name: companyName,
              edrpou: edrpou,
              phone: phone,
              referral_code: refCode // Pass the code here
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black font-sans selection:bg-blue-500/30 overflow-hidden relative transition-colors duration-500">

      {/* BACKGROUND ANIMATION */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      {/* GRID PATTERN */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] z-0"></div>

      <div className="container mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center justify-between gap-20 max-w-[1600px]">

        {/* LEFT SIDE: WELCOME TEXT (Visible on Desktop) */}
        <div className="flex-1 order-2 md:order-1">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full relative rounded-3xl overflow-hidden bg-white text-black p-8 md:p-12 md:py-16 shadow-2xl h-full flex flex-col justify-center"
          >
            {/* Background Image from Homepage */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] opacity-30 bg-cover bg-center"></div>

            <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase leading-tight mb-6 text-black">
                Готові До <br />Співпраці?
              </h1>
              <p className="text-xl text-black/70 mb-10 leading-relaxed font-medium max-w-2xl">
                Отримайте індивідуальну комерційну пропозицію та доступ до B2B цін вже сьогодні.
              </p>

              <button className="bg-black text-white px-8 md:px-10 py-4 md:py-5 rounded-xl font-bold text-lg md:text-xl hover:scale-105 transition-transform mb-12 md:mb-16 shadow-lg">
                Зв'язатись з менеджером
              </button>

              <div className="grid grid-cols-3 gap-4 md:gap-8 text-left max-w-3xl">
                <div>
                  <div className="text-3xl md:text-5xl font-black mb-2 text-black">500+</div>
                  <div className="text-sm text-black/50 font-bold uppercase tracking-wider">Партнерів</div>
                </div>
                <div>
                  <div className="text-3xl md:text-5xl font-black mb-2 text-black">30k</div>
                  <div className="text-sm text-black/50 font-bold uppercase tracking-wider">Товарів</div>
                </div>
                <div>
                  <div className="text-3xl md:text-5xl font-black mb-2 text-black">24h</div>
                  <div className="text-sm text-black/50 font-bold uppercase tracking-wider">Зразки</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE: LOGIN FORM */}
        <div className="w-full max-w-md order-1 md:order-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative"
            onMouseMove={handleMouseMove}
          >
            {/* SPOTLIGHT EFFECT */}
            <motion.div
              className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100 z-0"
              style={{
                background: useMotionTemplate`
                  radial-gradient(
                    650px circle at ${mouseX}px ${mouseY}px,
                    rgba(59, 130, 246, 0.15),
                    transparent 80%
                  )
                `,
              }}
            />

            <div className="bg-white/80 dark:bg-[#111]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 transition-all duration-300">

              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-white border border-gray-200 dark:border-white/10 shadow-inner">
                  <User size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {mode === "login" ? "Вхід в кабінет" : "Стати партнером"}
                </h2>
                <p className="text-gray-500 dark:text-zinc-500 text-sm mt-2">
                  {mode === "login" ? "Введіть ваші дані для входу" : "Заповінть анкету для реєстрації"}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-200 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-3 text-emerald-600 dark:text-emerald-200 text-sm">
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
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
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all mt-4 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  <span>{isLoading ? "Обробка..." : (mode === "login" ? "Увійти" : "Зареєструватись")}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/5 text-center">
                {mode === "login" ? (
                  <p className="text-sm text-gray-500 dark:text-zinc-500">
                    Ще не маєте акаунту?{" "}
                    {registrationAllowed ? (
                      <button onClick={() => setMode("register")} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                        Зареєструватись
                      </button>
                    ) : (
                      <span className="text-zinc-400 cursor-not-allowed">Реєстрація закрита</span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-zinc-500">
                    Вже є акаунт?{" "}
                    <button onClick={() => setMode("login")} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                      Увійти
                    </button>
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          <p className="text-center text-gray-400 dark:text-zinc-600 text-xs mt-8 font-medium">
            &copy; 2025 REBRAND STUDIO B2B SYSTEM
          </p>
        </div>
      </div>
    </div>
  );
}

// Допоміжний компонент для полів
function InputField({ icon: Icon, ...props }: any) {
  return (
    <div className="relative group/input">
      <Icon className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500 w-5 h-5 transition group-focus-within/input:text-blue-500" />
      <input
        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black/60 transition-all text-sm"
        {...props}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  )
}