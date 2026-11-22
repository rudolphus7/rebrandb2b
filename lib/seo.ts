export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://b2b.rebrand.com.ua').replace(/\/+$/, '');

export const SITE_NAME = 'REBRAND STUDIO';

export const DEFAULT_SEO = {
  title: 'Нанесення логотипів на одяг та мерч оптом — REBRAND STUDIO',
  description:
    'Нанесення логотипів на одяг, худі, футболки, сумки та сувеніри оптом в Україні: DTF-друк, машинна вишивка, шовкографія, термотрансфер. Онлайн-конструктор мерчу REBRAND STUDIO.',
  keywords: [
    'нанесення логотипу',
    'нанесення логотипів на одяг',
    'брендування одягу оптом',
    'корпоративний мерч',
    'брендована продукція',
    'друк на футболках оптом',
    'друк на худі з логотипом',
    'сувенірна продукція з логотипом',
    'DTF друк на одязі',
    'машинна вишивка логотипу',
    'шовкографія на текстилі',
    'корпоративні подарунки з логотипом',
    'REBRAND STUDIO',
  ],
};

export function buildCanonical(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}

export function stripHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function truncateText(input: string, maxLength = 160): string {
  const clean = stripHtml(input);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    email: 'rebrand.com.ua@gmail.com',
    areaServed: 'UA',
    description: DEFAULT_SEO.description,
  };
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'uk',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/catalog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
