import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import IsolatedContent from "@/components/IsolatedContent";

// Revalidate every minute so updates appear quickly but invalidation isn't hammed
export const revalidate = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateStaticParams() {
    const { data: pages } = await supabase.from("promo_pages").select("slug");
    return pages?.map(({ slug }) => ({ slug })) || [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    const { data: page } = await supabase.from("promo_pages").select("title, subtitle").eq("slug", slug).single();

    if (!page) return { title: 'Сторінку не знайдено' };

    return {
        title: `${page.title} | REBRAND STUDIO`,
        description: page.subtitle || page.title,
    };
}

export default async function PromoPage({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    const { data: page } = await supabase
        .from("promo_pages")
        .select("*")
        .eq("slug", slug)
        .single();

    if (!page) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-20">

            {/* Header / Nav */}
            <div className="container mx-auto px-4 py-8">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors mb-8">
                    <ArrowLeft size={16} /> На Головну
                </Link>
            </div>

            <article className="container mx-auto px-4 max-w-4xl">

                {/* Hero Section */}
                <header className="mb-12 text-center">
                    {page.image_url && (
                        <div className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden mb-8 shadow-2xl">
                            <img
                                src={page.image_url}
                                alt={page.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-left">
                                {page.subtitle && <div className="text-blue-400 font-bold uppercase tracking-widest mb-2">{page.subtitle}</div>}
                                <h1 className="text-4xl md:text-6xl font-black text-white uppercase leading-none drop-shadow-md">{page.title}</h1>
                            </div>
                        </div>
                    )}

                    {!page.image_url && (
                        <div className="mb-12 border-b border-gray-100 dark:border-white/10 pb-12">
                            <h1 className="text-4xl md:text-6xl font-black mb-4 uppercase">{page.title}</h1>
                            {page.subtitle && <p className="text-xl text-gray-500">{page.subtitle}</p>}
                        </div>
                    )}
                </header>

                {/* Content */}
                {/* Content - Isolated Shadow DOM */}
                <IsolatedContent
                    content={page.content || ''}
                    className="max-w-none"
                />

            </article>
        </div>
    );
}
