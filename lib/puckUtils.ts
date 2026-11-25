import type { Data } from '@measured/puck';
import type { BrandingService } from '@/lib/servicesData';
import type { InfoPageData } from '@/lib/infoPagesData';

export type PuckPageData = Data;

export function parsePuckContent(raw: string | null | undefined): Data | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && Array.isArray(parsed.content) && typeof parsed.root === 'object') {
      return parsed as Data;
    }
    return null;
  } catch {
    return null;
  }
}

export const DEFAULT_PUCK_DATA: Data = {
  root: { props: {} },
  content: [
    {
      type: 'HeroBanner',
      props: {
        id: 'hero-1',
        badge: 'REBRAND STUDIO',
        title: 'Корпоративний мерч під ключ',
        subtitle: 'Нанесення логотипів оптом по Україні',
        imageUrl: '/images/banners/hero-1.jpg',
        buttonText: 'Перейти в каталог',
        buttonHref: '/catalog',
      },
    },
    {
      type: 'TextBlock',
      props: {
        id: 'text-1',
        heading: 'Про пропозицію',
        text: 'Опишіть тут ключові переваги вашої сторінки, умови тиражу або спеціальну пропозицію для партнерів.',
        align: 'left',
      },
    },
  ],
};

export function serviceToPuckData(service: BrandingService): Data {
  return {
    root: { props: {} },
    content: [
      {
        type: 'HeroBanner',
        props: {
          id: `hero-${service.slug}`,
          badge: service.title,
          title: service.h1,
          subtitle: service.intro,
          imageUrl: service.image,
          buttonText: 'Приміряти логотип онлайн',
          buttonHref: '/CONSTRUCTOR',
          buttonIcon: 'palette',
          secondaryButtonText: service.recommendedCategories[0]?.label || 'Перейти в каталог',
          secondaryButtonHref: service.recommendedCategories[0]?.href || '/catalog',
        },
      },
      {
        type: 'FeatureGrid',
        props: {
          id: `metrics-${service.slug}`,
          icon1: 'layers',
          title1: `Тираж: ${service.minBatch}`,
          desc1: 'Мінімальна партія для запуску замовлення з нанесенням логотипу.',
          icon2: 'clock',
          title2: `Термін: ${service.turnaround}`,
          desc2: 'Середній час виготовлення після погодження макету та оплати.',
          icon3: 'shield',
          title3: `Стійкість: ${service.durability}`,
          desc3: 'Перевірена якість нанесення на корпоративному текстилі.',
        },
      },
      {
        type: 'TextBlock',
        props: {
          id: `adv-${service.slug}`,
          heading: 'Переваги методу',
          icon: 'check',
          listStyle: 'check',
          text: `${service.advantages.map((a) => `• ${a}`).join('\n')}\n\nНа що наносимо: ${service.idealFor.join(', ')}.`,
          align: 'left',
        },
      },
      {
        type: 'TextBlock',
        props: {
          id: `req-${service.slug}`,
          heading: 'Вимоги до макету та догляд',
          icon: 'file',
          listStyle: 'check',
          text: `Вимоги до файлів:\n${service.fileRequirements.map((r) => `• ${r}`).join('\n')}\n\nДогляд за виробом:\n${service.careTips.map((c) => `• ${c}`).join('\n')}`,
          align: 'left',
        },
      },
      ...service.faq.map((f, i) => ({
        type: 'FaqItem',
        props: {
          id: `faq-${service.slug}-${i}`,
          question: f.q,
          answer: f.a,
        },
      })),
      {
        type: 'CtaBanner',
        props: {
          id: `cta-${service.slug}`,
          heading: 'Готові перевірити ваш логотип на виробі?',
          text: 'Оберіть модель із каталогу або завантажте логотип у наш онлайн-конструктор.',
          buttonText: 'Відкрити конструктор',
          buttonHref: '/CONSTRUCTOR',
        },
      },
    ],
  };
}

export function infoToPuckData(info: InfoPageData): Data {
  return {
    root: { props: {} },
    content: [
      ...info.sections.map((sec, idx) => ({
        type: 'TextBlock',
        props: {
          id: `info-${info.slug}-${idx}`,
          heading: sec.heading,
          text: [
            ...sec.paragraphs,
            ...(sec.bullets ? sec.bullets.map((b) => `• ${b}`) : []),
          ].join('\n\n'),
          align: 'left',
        },
      })),
      {
        type: 'CtaBanner',
        props: {
          id: `cta-info-${info.slug}`,
          heading: 'Потрібна консультація по замовленню?',
          text: 'Перегляньте каталог продукції або створіть візуалізацію в конструкторі.',
          buttonText: 'Перейти в каталог',
          buttonHref: '/catalog',
        },
      },
    ],
  };
}
