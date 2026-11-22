import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  Layers,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import { BRANDING_SERVICES, getBrandingServiceBySlug } from '@/lib/servicesData';
import { SITE_NAME, SITE_URL, buildCanonical, buildBreadcrumbJsonLd } from '@/lib/seo';

export async function generateStaticParams() {
  return BRANDING_SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getBrandingServiceBySlug(slug);

  if (!service) {
    return { title: 'Послугу не знайдено', robots: { index: false, follow: false } };
  }

  const canonical = buildCanonical(`/posluhy/${service.slug}`);
  const ogImage = buildCanonical(service.image);

  return {
    title: service.metaTitle,
    description: service.metaDescription,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      locale: 'uk_UA',
      url: canonical,
      siteName: SITE_NAME,
      title: service.metaTitle,
      description: service.metaDescription,
      images: [{ url: ogImage, alt: service.imageAlt }],
    },
  };
}

export default async function BrandingServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getBrandingServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const canonical = buildCanonical(`/posluhy/${service.slug}`);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Головна', url: SITE_URL },
    { name: 'Послуги нанесення', url: buildCanonical('/posluhy') },
    { name: service.title, url: canonical },
  ]);

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.metaDescription,
    image: buildCanonical(service.image),
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: 'UA',
    url: canonical,
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: service.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const otherServices = BRANDING_SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="container mx-auto px-4 pt-6 md:pt-10 max-w-5xl space-y-10 md:space-y-14">
        <nav aria-label="Хлібні крихти" className="text-xs text-gray-500 uppercase tracking-wider">
          <Link href="/" className="hover:text-foreground transition-colors">Головна</Link> /{' '}
          <Link href="/posluhy" className="hover:text-foreground transition-colors">Послуги</Link> /{' '}
          <span className="text-foreground font-bold">{service.title}</span>
        </nav>

        {/* HERO З ЖИВИМ ЦЕХОВИМ ФОТО */}
        <section className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 bg-zinc-950 text-white shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={service.image}
            alt={service.imageAlt}
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/95 via-black/75 to-black/30" />

          <div className="relative z-10 p-6 sm:p-10 md:p-14 max-w-3xl space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 border border-white/20 backdrop-blur-md text-blue-300">
              {service.title}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {service.h1}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-zinc-200 leading-relaxed">
              {service.intro}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/CONSTRUCTOR"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg"
              >
                <Palette size={18} /> Приміряти логотип онлайн
              </Link>
              <Link
                href={service.recommendedCategories[0]?.href || '/catalog'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition backdrop-blur-md"
              >
                {service.recommendedCategories[0]?.label || 'Перейти в каталог'} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* КЛЮЧОВІ ПАРАМЕТРИ */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 flex items-start gap-3.5">
            <Layers size={22} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Мінімальний тираж</p>
              <p className="text-xl font-black">{service.minBatch}</p>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 flex items-start gap-3.5">
            <Clock size={22} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Термін виготовлення</p>
              <p className="text-xl font-black">{service.turnaround}</p>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 flex items-start gap-3.5">
            <ShieldCheck size={22} className="text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Зносостійкість</p>
              <p className="text-lg font-black leading-snug">{service.durability}</p>
            </div>
          </div>
        </section>

        {/* ПЕРЕВАГИ + НА ЩО НАНОСИМО */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-4">
            <h2 className="text-xl font-bold">Переваги методу</h2>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              {service.advantages.map((adv) => (
                <li key={adv} className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{adv}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-4">
            <h2 className="text-xl font-bold">На що найкраще наносити</h2>
            <div className="flex flex-wrap gap-2">
              {service.idealFor.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
            {service.limitations.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-white/10 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <strong className="text-foreground">Важливо врахувати:</strong> {service.limitations[0]}
              </div>
            )}
          </div>
        </section>

        {/* ВИМОГИ ДО МАКЕТУ + ДОГЛЯД */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileCheck2 size={20} className="text-blue-500" /> Вимоги до макету логотипу
            </h2>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
              {service.fileRequirements.map((req) => (
                <li key={req}>{req}</li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-500" /> Рекомендації з догляду
            </h2>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
              {service.careTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Часті питання</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {service.faq.map((f) => (
              <div
                key={f.q}
                className="p-5 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10"
              >
                <h3 className="font-bold text-base mb-1.5">{f.q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA БЛОК */}
        <section className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-white/10 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold">Готові перевірити ваш логотип на виробі?</h2>
            <p className="text-sm text-zinc-400">
              Оберіть модель із каталогу або завантажте логотип у наш онлайн-конструктор брендування.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {service.recommendedCategories.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition"
              >
                {cat.label}
              </Link>
            ))}
            <Link
              href="/CONSTRUCTOR"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition"
            >
              Відкрити конструктор <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* ІНШІ МЕТОДИ НАНЕСЕННЯ (перелінковка) */}
        <section className="pt-6 border-t border-gray-200 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Інші методи нанесення логотипів</h2>
            <Link href="/posluhy" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Порівняти всі →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {otherServices.map((other) => (
              <Link
                key={other.slug}
                href={`/posluhy/${other.slug}`}
                className="group rounded-2xl overflow-hidden bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 hover:border-blue-500/40 transition-all flex flex-col"
              >
                <div className="h-32 overflow-hidden bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={other.image}
                    alt={other.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm group-hover:text-blue-500 transition-colors">{other.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{other.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
