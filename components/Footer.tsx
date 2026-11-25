'use client';

import Link from 'next/link';
import { Mail, MapPin, Clock, ArrowUpRight, Palette } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-[#09090b] text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-white/10 mt-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Колонка 1: Бренд та контакти */}
          <div className="space-y-4">
            <Link href="/" className="inline-block text-2xl font-black italic tracking-tighter text-gray-900 dark:text-white">
              REBRAND <span className="text-xs font-bold not-italic text-blue-600 dark:text-blue-400 align-top">B2B</span>
            </Link>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Оптова B2B-платформа брендованої продукції, корпоративного мерчу та професійного нанесення логотипів по всій Україні.
            </p>
            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <a
                href="mailto:rebrand.com.ua@gmail.com"
                className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Mail size={14} className="text-blue-500 shrink-0" />
                rebrand.com.ua@gmail.com
              </a>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-500 shrink-0" />
                Пн–Пт: 09:00 – 18:00
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-blue-500 shrink-0" />
                Доставка по всій Україні (Нова Пошта)
              </div>
            </div>
            <div className="pt-2">
              <Link
                href="/CONSTRUCTOR"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
              >
                <Palette size={14} /> Онлайн-конструктор
              </Link>
            </div>
          </div>

          {/* Колонка 2: Посадкові сторінки послуг */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
              Послуги нанесення
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/posluhy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                  Усі методи брендування
                </Link>
              </li>
              <li>
                <Link href="/posluhy/dtf-druk" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  DTF-друк на одязі
                </Link>
              </li>
              <li>
                <Link href="/posluhy/mashynna-vyshyvka" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Машинна вишивка логотипів
                </Link>
              </li>
              <li>
                <Link href="/posluhy/shovkografiya" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Шовкографія оптом
                </Link>
              </li>
              <li>
                <Link href="/posluhy/termotransfer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Термотрансферний друк
                </Link>
              </li>
              <li>
                <Link href="/CONSTRUCTOR" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Конструктор мерчу
                </Link>
              </li>
            </ul>
          </div>

          {/* Колонка 3: Каталог та Клієнтам */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
              Клієнтам і Каталог
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/catalog" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                  Весь каталог товарів
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=odiah" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Одяг під нанесення
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=bags" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Сумки, рюкзаки та шопери
                </Link>
              </li>
              <li>
                <Link href="/info/oplata-i-dostavka" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Оплата і доставка
                </Link>
              </li>
              <li>
                <Link href="/info/vimogy-do-maketiv" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Вимоги до макетів
                </Link>
              </li>
              <li>
                <Link href="/info/umovy-spivpraci" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Умови B2B-співпраці
                </Link>
              </li>
            </ul>
          </div>

          {/* Колонка 4: Юридичні сторінки та Кабінет */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
              Документи та Кабінет
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/info/uhoda-korystuvacha" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Угода користувача (Оферта)
                </Link>
              </li>
              <li>
                <Link href="/info/polityka-konfidenciynosti" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Політика конфіденційності
                </Link>
              </li>
              <li>
                <Link href="/info/povernennya-ta-obmin" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Гарантія та повернення
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Особистий B2B-кабінет
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1">
                  Вхід для партнерів <ArrowUpRight size={14} />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Нижня смуга */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} REBRAND STUDIO. Всі права захищено.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
              Безготівковий рахунок (ТОВ / ФОП)
            </span>
            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
              Доставка Новою Поштою
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
