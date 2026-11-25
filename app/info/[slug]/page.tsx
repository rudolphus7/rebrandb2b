import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { INFO_PAGES, getInfoPageBySlug } from '@/lib/infoPagesData';
import { SITE_NAME, SITE_URL, buildCanonical, buildBreadcrumbJsonLd } from '@/lib/seo';

export async function generateStaticParams() {
  return INFO_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getInfoPageBySlug(slug);

  if (!page) {
    return { title: 'Сторінку не знайдено', robots: { index: false, follow: false } };
  }

  const canonical = buildCanonical(`/info/${page.slug}`);

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      locale: 'uk_UA',
      url: canonical,
      siteName: SITE_NAME,
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}

export default async function InfoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getInfoPageBySlug(slug);

  if (!page) {
    notFound();
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Головна', url: SITE_URL },
    { name: page.title, url: buildCanonical(`/info/${page.slug}`) },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        <nav aria-label="Хлібні крихти" className="text-xs text-gray-500 uppercase tracking-wider">
          <Link href="/" className="hover:text-foreground transition-colors">Головна</Link> /{' '}
          <span className="text-foreground font-bold">{page.title}</span>
        </nav>

        <header className="space-y-3 border-b border-gray-200 dark:border-white/10 pb-6">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{page.title}</h1>
          <p className="text-xs text-gray-500">Оновлено: {page.updatedAt}</p>
        </header>

        <div className="space-y-8">
          {page.sections.map((section) => (
            <section
              key={section.heading}
              className="p-6 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-3"
            >
              <h2 className="text-lg sm:text-xl font-bold">{section.heading}</h2>
              {section.paragraphs.map((p, idx) => (
                <p key={idx} className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600 dark:text-gray-300 pt-1">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="pt-4 border-t border-gray-200 dark:border-white/10 flex flex-wrap gap-3">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:opacity-90 transition"
          >
            Перейти в каталог <ArrowRight size={16} />
          </Link>
          <Link
            href="/posluhy"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition"
          >
            Методи нанесення
          </Link>
        </section>
      </main>
    </div>
  );
}
