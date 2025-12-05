import { createClient } from '@supabase/supabase-js'

// Цей клієнт має права "Бога". Використовувати ТІЛЬКИ на сервері (API routes).
// Ніколи не імпортуй цей файл у React-компоненти (use client)!

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Додай це в .env.local

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing!')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})