'use client';

import type { ReactNode } from 'react';
import { DropZone, type Config } from '@measured/puck';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  Layers,
  Package,
  Palette,
  ShieldCheck,
  Truck,
} from 'lucide-react';

const ICON_OPTIONS = [
  { label: 'Без іконки', value: 'none' },
  { label: 'Шари / Тираж (Синя)', value: 'layers' },
  { label: 'Годинник / Термін (Жовта)', value: 'clock' },
  { label: 'Щит / Якість (Зелена)', value: 'shield' },
  { label: 'Галочка (Зелена)', value: 'check' },
  { label: 'Палітра / Дизайн (Синя)', value: 'palette' },
  { label: 'Коробка / Товар', value: 'package' },
  { label: 'Доставка / Вантажівка', value: 'truck' },
  { label: 'Макет / Файл (Синя)', value: 'file' },
];

function renderIcon(name?: string, size = 20) {
  switch (name) {
    case 'layers':
      return <Layers size={size} className="text-blue-500 shrink-0" />;
    case 'clock':
      return <Clock size={size} className="text-amber-500 shrink-0" />;
    case 'shield':
      return <ShieldCheck size={size} className="text-emerald-500 shrink-0" />;
    case 'check':
      return <CheckCircle2 size={size} className="text-emerald-500 shrink-0" />;
    case 'palette':
      return <Palette size={size} className="text-blue-400 shrink-0" />;
    case 'package':
      return <Package size={size} className="text-zinc-300 shrink-0" />;
    case 'truck':
      return <Truck size={size} className="text-blue-400 shrink-0" />;
    case 'file':
      return <FileCheck2 size={size} className="text-blue-500 shrink-0" />;
    default:
      return null;
  }
}

export const puckConfig: Config = {
  root: {
    render: ({ children }: { children: ReactNode }) => (
      <div className="space-y-6 text-foreground font-sans">{children}</div>
    ),
  },
  categories: {
    sections: {
      title: 'Готові секції',
      components: ['HeroBanner', 'ImageWithText', 'FeatureGrid', 'CtaBanner', 'FaqItem'],
    },
    layout: {
      title: 'Сітки та структура',
      components: ['TwoColumns', 'SpacerBlock'],
    },
    content: {
      title: 'Контент та медіа',
      components: ['TextBlock', 'ImageBlock', 'ButtonBlock', 'VideoBlock'],
    },
  },
  components: {
    HeroBanner: {
      label: 'Hero Банер',
      fields: {
        badge: { type: 'text', label: 'Бейдж зверху' },
        title: { type: 'text', label: 'Головний заголовок' },
        subtitle: { type: 'textarea', label: 'Підзаголовок / опис' },
        imageUrl: { type: 'text', label: 'URL зображення' },
        buttonText: { type: 'text', label: 'Текст основної кнопки' },
        buttonHref: { type: 'text', label: 'Посилання основної кнопки' },
        buttonIcon: { type: 'select', label: 'Іконка кнопки', options: ICON_OPTIONS },
        secondaryButtonText: { type: 'text', label: 'Текст другої кнопки (опц.)' },
        secondaryButtonHref: { type: 'text', label: 'Посилання другої кнопки' },
      },
      defaultProps: {
        badge: 'REBRAND STUDIO',
        title: 'Корпоративний мерч',
        subtitle: 'Якісне нанесення логотипів на одяг та сувеніри оптом.',
        imageUrl: '/images/banners/hero-1.jpg',
        buttonText: 'Перейти в каталог',
        buttonHref: '/catalog',
        buttonIcon: 'palette',
        secondaryButtonText: '',
        secondaryButtonHref: '/catalog',
      },
      render: ({
        badge,
        title,
        subtitle,
        imageUrl,
        buttonText,
        buttonHref,
        buttonIcon,
        secondaryButtonText,
        secondaryButtonHref,
      }) => (
        <section className="relative rounded-3xl overflow-hidden bg-zinc-950 text-white border border-white/10 my-2">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title || 'Banner'}
              className="absolute inset-0 w-full h-full object-cover opacity-45"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-transparent" />
          <div className="relative z-10 p-8 sm:p-12 md:p-14 max-w-3xl space-y-4">
            {badge && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 text-blue-300">
                {badge}
              </span>
            )}
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">{subtitle}</p>
            )}
            {(buttonText || secondaryButtonText) && (
              <div className="flex flex-wrap gap-3 pt-2">
                {buttonText && (
                  <Link
                    href={buttonHref || '/catalog'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition"
                  >
                    {renderIcon(buttonIcon ?? 'palette', 18)}
                    <span>{buttonText}</span>
                  </Link>
                )}
                {secondaryButtonText && (
                  <Link
                    href={secondaryButtonHref || '/catalog'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition"
                  >
                    <span>{secondaryButtonText}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      ),
    },

    TextBlock: {
      label: 'Текстовий блок',
      fields: {
        heading: { type: 'text', label: 'Заголовок' },
        icon: { type: 'select', label: 'Іконка заголовка', options: ICON_OPTIONS },
        text: { type: 'textarea', label: 'Текст (рядки з • стануть списком)' },
        listStyle: {
          type: 'select',
          label: 'Стиль списку',
          options: [
            { label: 'Звичайний текст', value: 'plain' },
            { label: 'Із зеленими галочками (•)', value: 'check' },
          ],
        },
        align: {
          type: 'select',
          label: 'Вирівнювання',
          options: [
            { label: 'Ліворуч', value: 'left' },
            { label: 'По центру', value: 'center' },
          ],
        },
      },
      defaultProps: {
        heading: 'Заголовок секції',
        icon: 'none',
        text: 'Додайте корисний опис або інформацію для клієнтів.',
        listStyle: 'plain',
        align: 'left',
      },
      render: ({ heading, icon, text, listStyle, align }) => {
        const lines = (text || '').split('\n');
        return (
          <section
            className={`my-4 p-6 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-3 ${
              align === 'center' ? 'text-center' : 'text-left'
            }`}
          >
            {heading && (
              <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2.5 ${align === 'center' ? 'justify-center' : ''}`}>
                {renderIcon(icon, 20)}
                <span>{heading}</span>
              </h2>
            )}
            {text && (
              <div className="space-y-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                {lines.map((line: string, idx: number) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={idx} className="h-1" />;
                  if (listStyle !== 'plain' && trimmed.startsWith('•')) {
                    return (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{trimmed.replace(/^•\s*/, '')}</span>
                      </div>
                    );
                  }
                  return <p key={idx}>{line}</p>;
                })}
              </div>
            )}
          </section>
        );
      },
    },

    ImageWithText: {
      label: 'Фото + Текст',
      fields: {
        heading: { type: 'text', label: 'Заголовок' },
        text: { type: 'textarea', label: 'Опис' },
        imageUrl: { type: 'text', label: 'URL фото' },
        imagePosition: {
          type: 'select',
          label: 'Позиція фото',
          options: [
            { label: 'Ліворуч', value: 'left' },
            { label: 'Праворуч', value: 'right' },
          ],
        },
        buttonText: { type: 'text', label: 'Текст кнопки (необов’язково)' },
        buttonHref: { type: 'text', label: 'Посилання кнопки' },
      },
      defaultProps: {
        heading: 'Висока якість нанесення',
        text: 'Працюємо на сучасному обладнанні з контролем кожного виробу перед відправкою.',
        imageUrl: '/images/services/dtf-druk.jpg',
        imagePosition: 'left',
        buttonText: 'Відкрити конструктор',
        buttonHref: '/CONSTRUCTOR',
      },
      render: ({ heading, text, imageUrl, imagePosition, buttonText, buttonHref }) => (
        <section className="my-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-5 sm:p-6 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10">
          <div className={imagePosition === 'right' ? 'md:order-2' : ''}>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={heading || 'Image'}
                className="w-full h-64 sm:h-72 object-cover rounded-xl"
              />
            )}
          </div>
          <div className="space-y-3">
            {heading && <h2 className="text-xl sm:text-2xl font-bold">{heading}</h2>}
            {text && (
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {text}
              </p>
            )}
            {buttonText && (
              <div className="pt-1">
                <Link
                  href={buttonHref || '/catalog'}
                  className="inline-block px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:opacity-90 transition"
                >
                  {buttonText}
                </Link>
              </div>
            )}
          </div>
        </section>
      ),
    },

    FeatureGrid: {
      label: 'Сітка переваг (3 картки)',
      fields: {
        icon1: { type: 'select', label: 'Картка 1 — Іконка', options: ICON_OPTIONS },
        title1: { type: 'text', label: 'Картка 1 — Заголовок' },
        desc1: { type: 'textarea', label: 'Картка 1 — Опис' },
        icon2: { type: 'select', label: 'Картка 2 — Іконка', options: ICON_OPTIONS },
        title2: { type: 'text', label: 'Картка 2 — Заголовок' },
        desc2: { type: 'textarea', label: 'Картка 2 — Опис' },
        icon3: { type: 'select', label: 'Картка 3 — Іконка', options: ICON_OPTIONS },
        title3: { type: 'text', label: 'Картка 3 — Заголовок' },
        desc3: { type: 'textarea', label: 'Картка 3 — Опис' },
      },
      defaultProps: {
        icon1: 'layers',
        title1: 'Мінімальний тираж',
        desc1: 'Від 10 одиниць для DTF-друку та машинної вишивки.',
        icon2: 'clock',
        title2: 'Швидке виробництво',
        desc2: 'Виготовлення партії за 3–7 робочих днів по Україні.',
        icon3: 'shield',
        title3: 'B2B-оплата',
        desc3: 'Безготівковий рахунок для ТОВ та ФОП із повним пакетом документів.',
      },
      render: ({ icon1, title1, desc1, icon2, title2, desc2, icon3, title3, desc3 }) => (
        <section className="my-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { i: icon1 ?? 'layers', t: title1, d: desc1 },
            { i: icon2 ?? 'clock', t: title2, d: desc2 },
            { i: icon3 ?? 'shield', t: title3, d: desc3 },
          ]
            .filter((item) => item.t || item.d)
            .map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 flex items-start gap-3.5"
              >
                {renderIcon(item.i, 22)}
                <div className="space-y-1">
                  <h3 className="font-bold text-base leading-snug">{item.t}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.d}</p>
                </div>
              </div>
            ))}
        </section>
      ),
    },

    CtaBanner: {
      label: 'CTA Банер (Заклик до дії)',
      fields: {
        heading: { type: 'text', label: 'Заголовок' },
        text: { type: 'textarea', label: 'Підпис' },
        buttonText: { type: 'text', label: 'Текст кнопки' },
        buttonHref: { type: 'text', label: 'Посилання кнопки' },
      },
      defaultProps: {
        heading: 'Готові запустити замовлення?',
        text: 'Оберіть товари в каталозі або завантажте логотип у наш онлайн-конструктор.',
        buttonText: 'Відкрити конструктор',
        buttonHref: '/CONSTRUCTOR',
      },
      render: ({ heading, text, buttonText, buttonHref }) => (
        <section className="my-6 p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-white/10 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{heading}</h2>
            <p className="text-sm text-zinc-400">{text}</p>
          </div>
          {buttonText && (
            <Link
              href={buttonHref || '/CONSTRUCTOR'}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shrink-0"
            >
              {buttonText}
            </Link>
          )}
        </section>
      ),
    },

    FaqItem: {
      label: 'Питання-відповідь (FAQ)',
      fields: {
        question: { type: 'text', label: 'Питання' },
        answer: { type: 'textarea', label: 'Відповідь' },
      },
      defaultProps: {
        question: 'Який мінімальний тираж замовлення?',
        answer: 'Виконуємо брендування від 10 одиниць продукції.',
      },
      render: ({ question, answer }) => (
        <div className="my-3 p-5 rounded-2xl bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-white/10 space-y-1.5">
          <h3 className="font-bold text-base">{question}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{answer}</p>
        </div>
      ),
    },

    TwoColumns: {
      label: '2 колонки (вільний макет)',
      fields: {
        gap: {
          type: 'select',
          label: 'Відступ між колонками',
          options: [
            { label: 'Малий', value: 'gap-4' },
            { label: 'Середній', value: 'gap-6' },
            { label: 'Великий', value: 'gap-10' },
          ],
        },
      },
      defaultProps: {
        gap: 'gap-6',
      },
      render: ({ gap }) => (
        <div className={`my-6 grid grid-cols-1 md:grid-cols-2 ${gap || 'gap-6'}`}>
          <div className="min-h-[80px]">
            <DropZone zone="left-column" />
          </div>
          <div className="min-h-[80px]">
            <DropZone zone="right-column" />
          </div>
        </div>
      ),
    },

    ImageBlock: {
      label: 'Зображення',
      fields: {
        imageUrl: { type: 'text', label: 'URL зображення' },
        alt: { type: 'text', label: 'Alt-опис (для SEO)' },
        height: {
          type: 'select',
          label: 'Висота',
          options: [
            { label: 'Компактна (240px)', value: 'h-60' },
            { label: 'Середня (360px)', value: 'h-[360px]' },
            { label: 'Велика (480px)', value: 'h-[480px]' },
          ],
        },
        rounded: {
          type: 'select',
          label: 'Заокруглення',
          options: [
            { label: 'Без заокруглень', value: 'rounded-none' },
            { label: 'Середнє', value: 'rounded-2xl' },
          ],
        },
      },
      defaultProps: {
        imageUrl: '/images/services/hero-workshop.jpg',
        alt: 'REBRAND STUDIO',
        height: 'h-[360px]',
        rounded: 'rounded-2xl',
      },
      render: ({ imageUrl, alt, height, rounded }) => (
        <div className="my-4 overflow-hidden">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={alt || 'Image'}
              className={`w-full ${height || 'h-[360px]'} object-cover ${rounded || 'rounded-2xl'}`}
            />
          )}
        </div>
      ),
    },

    ButtonBlock: {
      label: 'Кнопка',
      fields: {
        text: { type: 'text', label: 'Текст кнопки' },
        href: { type: 'text', label: 'Посилання' },
        variant: {
          type: 'select',
          label: 'Стиль',
          options: [
            { label: 'Синя (основна)', value: 'primary' },
            { label: 'Контрастна (чорна/біла)', value: 'contrast' },
            { label: 'Контурна', value: 'outline' },
          ],
        },
        align: {
          type: 'select',
          label: 'Вирівнювання',
          options: [
            { label: 'Ліворуч', value: 'text-left' },
            { label: 'По центру', value: 'text-center' },
          ],
        },
      },
      defaultProps: {
        text: 'Перейти в каталог',
        href: '/catalog',
        variant: 'primary',
        align: 'text-left',
      },
      render: ({ text, href, variant, align }) => {
        const cls =
          variant === 'contrast'
            ? 'bg-black dark:bg-white text-white dark:text-black'
            : variant === 'outline'
            ? 'border border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10'
            : 'bg-blue-600 hover:bg-blue-500 text-white';
        return (
          <div className={`my-4 ${align || 'text-left'}`}>
            <Link
              href={href || '/catalog'}
              className={`inline-block px-6 py-3 rounded-xl font-bold text-sm transition ${cls}`}
            >
              {text}
            </Link>
          </div>
        );
      },
    },

    VideoBlock: {
      label: 'Відео (YouTube URL)',
      fields: {
        youtubeUrl: { type: 'text', label: 'Посилання на YouTube' },
      },
      defaultProps: {
        youtubeUrl: '',
      },
      render: ({ youtubeUrl }) => {
        const match = youtubeUrl?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
        const videoId = match?.[1];
        if (!videoId) {
          return (
            <div className="my-4 p-8 rounded-2xl border border-dashed border-gray-300 dark:border-white/20 text-center text-sm text-gray-500">
              Вставте посилання на YouTube у правій панелі
            </div>
          );
        }
        return (
          <div className="my-6 aspect-video rounded-2xl overflow-hidden border border-white/10">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        );
      },
    },

    SpacerBlock: {
      label: 'Відступ / Розділювач',
      fields: {
        size: {
          type: 'select',
          label: 'Висота',
          options: [
            { label: 'Малий (24px)', value: 'py-3' },
            { label: 'Середній (48px)', value: 'py-6' },
            { label: 'Великий (80px)', value: 'py-10' },
          ],
        },
        showLine: {
          type: 'select',
          label: 'Лінія-розділювач',
          options: [
            { label: 'Так', value: 'yes' },
            { label: 'Ні', value: 'no' },
          ],
        },
      },
      defaultProps: {
        size: 'py-6',
        showLine: 'yes',
      },
      render: ({ size, showLine }) => (
        <div className={size || 'py-6'}>
          {showLine === 'yes' && <hr className="border-gray-200 dark:border-white/10" />}
        </div>
      ),
    },
  },
};
