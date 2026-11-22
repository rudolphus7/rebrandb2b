'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthContext';
import LoginPage from '@/components/LoginPage';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/';
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(nextParam);
    }
  }, [loading, isAuthenticated, nextParam, router]);

  const handleLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      return;
    }
    router.replace(nextParam);
  };

  return <LoginPage onLogin={handleLogin} />;
}

export default function LoginRoutePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Завантаження...</div>}>
      <LoginContent />
    </Suspense>
  );
}
