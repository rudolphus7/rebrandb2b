import Link from 'next/link';
import { Search, Home, LayoutGrid, Palette } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] bg-background text-foreground flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full text-center space-y-6">
        <p className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Помилка 404
        </p>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          Сторінку не знайдено
        </h1>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          Можливо, товар знято з виробництва або посилання застаріло. Скористайтеся пошуком по каталогу або перейдіть у потрібний розділ:
        </p>

        <form action="/catalog" method="GET" className="flex gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              placeholder="Пошук товарів (худі, чашка, шопер...)"
              className="w-full h-11 pl-4 pr-10 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-blue-500"
            />
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            type="submit"
            className="px-5 h-11 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:opacity-90 transition"
          >
            Знайти
          </button>
        </form>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
          >
            <Home size={16} /> Головна
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
          >
            <LayoutGrid size={16} /> Каталог
          </Link>
          <Link
            href="/posluhy"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
          >
            Методи нанесення
          </Link>
          <Link
            href="/CONSTRUCTOR"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition"
          >
            <Palette size={16} /> Конструктор
          </Link>
        </div>
      </div>
    </div>
  );
}
