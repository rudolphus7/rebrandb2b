import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Створюємо клієнт Supabase для роботи з куками
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 2. Отримуємо сесію користувача
  const { data: { user } } = await supabase.auth.getUser()

  // 3. ЛОГІКА ЗАХИСТУ /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    
    // А. Якщо не залогінений -> на вхід
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Б. Перевірка ролі (робимо запит в базу)
    // Увага: цей запит виконується на сервері, це швидко і безпечно
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // В. Якщо не адмін -> на головну
    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Запускаємо middleware на всіх шляхах, окрім статичних файлів та api
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}