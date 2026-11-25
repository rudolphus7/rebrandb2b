import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock, Layers, Palette, ShieldCheck } from 'lucide-react';
import { BRANDING_SERVICES } from '@/lib/servicesData';
import { SITE_NAME, SITE_URL, buildCanonical, buildBreadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Послуги нанесення логотипів на одяг та сувеніри',
  description: `Методи нанесення логотипів у ${SITE_NAME}: DTF-друк, машинна вишивка, шовкографія та термотрансфер. Порівняння технологій, терміни та оптові замовлення по Україні.`,
  alternates: {
    canonical: buildCanonical('/posluhy'),
  },
};

export default function ServicesHubPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Головна', url: SITE_URL },
    { name: 'Послуги нанесення', url: buildCanonical('/posluhy') },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="container mx-auto px-4 pt-6 md:pt-10 max-w-6xl space-y-12 md:space-y-16">
        <nav aria-label="Хлібні крихти" className="text-xs text-gray-500 uppercase tracking-wider">
          <Link href="/" className="hover:text-foreground transition-colors">Головна</Link> /{' '}
          <span className="text-foreground font-bold">Послуги нанесення</span>
        </nav>

        {/* HERO */}
        <section className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 bg-zinc-950 text-white shadow-2xl">
          <Image
            src="/images/services/hero-workshop.jpg"
            alt="Корпоративний одяг та текстиль під нанесення логотипу REBRAND STUDIO"
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 1152px"
            className="object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/90 via-black/70 to-black/30" />

          <div className="relative z-10 p-6 sm:p-10 md:p-14 max-w-3xl space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/20 backdrop-blur-md text-blue-300">
              <Layers size={14} /> Виробництво повного циклу
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Методи нанесення логотипів на одяг та мерч
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed">
              Підбираємо технологію брендування під тип тканини, складність макета та тираж.
              Працюємо з корпоративним одягом, сумками, кепками та сувенірною продукцією оптом по всій Україні.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/CONSTRUCTOR"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg"
              >
                <Palette size={18} /> Приміряти в конструкторі
              </Link>
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition backdrop-blur-md"
              >
                Обрати товари в каталозі <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* СІТКА МЕТОДІВ З ПРИРОДНИМИ ФОТО */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Оберіть технологію друку</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Натисніть на метод, щоб переглянути деталі, вимоги до макету та приклади застосування
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BRANDING_SERVICES.map((service) => (
              <Link
                key={service.slug}
                href={`/posluhy/${service.slug}`}
                className="group rounded-2xl overflow-hidden bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 hover:border-blue-500/50 transition-all shadow-sm hover:shadow-xl flex flex-col"
              >
                <div className="relative h-52 sm:h-60 overflow-hidden bg-zinc-900">
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 text-[11px] font-bold text-white">
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15">
                      Тираж: {service.minBatch}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15">
                      Термін: {service.turnaround}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {service.shortDesc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate pr-2">
                      {service.idealFor.slice(0, 2).join(' • ')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">
                      Детальніше <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ПОРІВНЯННЯ: КАРТКИ НА ТЕЛЕФОНІ + ТАБЛИЦЯ НА ДЕСКТОПІ */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Порівняння методів нанесення</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ключові параметри, які допомагають обрати оптимальний варіант під ваш бюджет і тираж
            </p>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {BRANDING_SERVICES.map((s) => (
              <Link
                key={s.slug}
                href={`/posluhy/${s.slug}`}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-2.5 block"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{s.title}</h3>
                  <ArrowRight size={16} className="text-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white dark:bg-black/30">
                    <span className="text-gray-400 block">Мін. тираж</span>
                    <span className="font-bold">{s.minBatch}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-black/30">
                    <span className="text-gray-400 block">Термін</span>
                    <span className="font-bold">{s.turnaround}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  <strong>Стійкість:</strong> {s.durability}
                </p>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414]">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a1a] text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="p-4">Метод нанесення</th>
                  <th className="p-4">Мін. тираж</th>
                  <th className="p-4">Термін</th>
                  <th className="p-4">Стійкість</th>
                  <th className="p-4">Найкраще для</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {BRANDING_SERVICES.map((s) => (
                  <tr key={s.slug} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold">
                      <Link href={`/posluhy/${s.slug}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {s.title}
                      </Link>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{s.minBatch}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{s.turnaround}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{s.durability}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">{s.idealFor.slice(0, 2).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ШВИДКИЙ ГІД */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-2">
            <Clock size={22} className="text-blue-500" />
            <h3 className="font-bold text-base">Невелика партія або терміново</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Обирайте <Link href="/posluhy/dtf-druk" className="text-blue-500 hover:underline font-semibold">DTF-друк</Link> — від 10 одиниць, без обмежень по кольорах і з високою деталізацією.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-2">
            <ShieldCheck size={22} className="text-emerald-500" />
            <h3 className="font-bold text-base">Преміум-мерч та уніформа</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Обирайте <Link href="/posluhy/mashynna-vyshyvka" className="text-blue-500 hover:underline font-semibold">машинну вишивку</Link> — об’ємний логотип нитками на поло, худі та флісі служить роками.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-2">
            <Layers size={22} className="text-purple-500" />
            <h3 className="font-bold text-base">Опт від 50+ одиниць</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Обирайте <Link href="/posluhy/shovkografiya" className="text-blue-500 hover:underline font-semibold">шовкографію</Link> — найнижча ціна за принт при середніх і великих тиражах.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
