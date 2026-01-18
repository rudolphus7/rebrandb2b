import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Створюємо клієнт Supabase для роботи з куками (Recommended SSR Pattern)
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
          // Ми створюємо нову відповідь з оновленими куками
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

  // 2. Отримання сесії (getUser автоматично оновлює токени за потреби)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname;

  // 3. УНІВЕРСАЛЬНИЙ ЗАХИСТ СТОРІНОК
  // Якщо користувач не авторизований і це не головна сторінка, не API і не статичні файли
  if (!user && pathname !== '/') {
    // Перевіряємо, чи це не системні запити
    const isPublicAsset = pathname.includes('.') || pathname.startsWith('/_next') || pathname.startsWith('/api');

    if (!isPublicAsset) {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 4. ЗАХИСТ АДМІНКИ (додаткова перевірка ролі)
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Запускаємо middleware на всіх шляхах
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
