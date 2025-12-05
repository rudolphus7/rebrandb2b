import { createBrowserClient } from '@supabase/ssr'

// Використовуємо createBrowserClient замість старого createClient.
// Він автоматично керує cookies, щоб Middleware бачив сесію.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)