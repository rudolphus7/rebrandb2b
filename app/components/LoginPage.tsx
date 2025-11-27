"use client";

import { useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { ArrowRight, Lock, User, Hexagon } from "lucide-react";

export default function LoginPage({ onLogin }: { onLogin: (e: any, p: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onLogin(email, password);
    setIsLoading(false);
  };

  return (
    <div 
      className="group relative min-h-screen flex items-center justify-center bg-black overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* СІТКА (Збільшив прозорість, щоб точно було видно) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808030_1px,transparent_1px),linear-gradient(to_bottom,#80808030_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* ПРОЖЕКТОР */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
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

      {/* КАРТКА (Прибрав initial={{ opacity: 0 }}, тепер вона видима завжди) */}
      <div className="relative z-10 w-full max-w-md p-8">
        
        <div className="flex justify-center mb-8">
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
             <Hexagon className="relative w-16 h-16 text-white stroke-[1.5]" />
             <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-xl tracking-tighter text-white">R</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-white/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">REBRAND STUDIO</h1>
            <p className="text-zinc-400 text-sm mt-2 uppercase tracking-widest">B2B Портал клієнта</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 ml-1 uppercase tracking-wider">Email</label>
              <div className="relative group/input">
                <User className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 ml-1 uppercase tracking-wider">Пароль</label>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-3.5 text-zinc-500 w-5 h-5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              disabled={isLoading}
              className="w-full bg-white text-black font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors mt-4"
            >
              <span>{isLoading ? "Вхід..." : "Увійти"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-8">
          REBRAND STUDIO Security Systems v2.0
        </p>
      </div>
    </div>
  );
}