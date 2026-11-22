import { createClient } from '@supabase/supabase-js';
import HomeClient, { DEFAULT_SLIDES } from '@/components/HomeClient';

export const revalidate = 300;

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [hitRes, newRes, showcaseRes, bannerRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, base_price, old_price, label, image_url, description, vendor_article, slug')
      .eq('label', 'hit')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('products')
      .select('id, title, base_price, old_price, label, image_url, description, vendor_article, slug')
      .eq('label', 'new')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('products')
      .select('id, title, base_price, old_price, label, image_url, description, vendor_article, slug')
      .gt('base_price', 0)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('banners').select('*').order('id', { ascending: false }),
  ]);

  const sortByPrice = (items: any[] | null) => {
    if (!items) return [];
    const valid = items.filter((p) => p.base_price > 0);
    const zeros = items.filter((p) => p.base_price === 0);
    return [...valid, ...zeros];
  };

  const hits = sortByPrice(hitRes.data);
  const news = sortByPrice(newRes.data);
  const showcase = showcaseRes.data || [];
  const banners = bannerRes.data && bannerRes.data.length > 0 ? bannerRes.data : DEFAULT_SLIDES;

  return (
    <HomeClient
      initialHits={hits}
      initialNews={news}
      initialShowcase={showcase}
      initialBanners={banners}
    />
  );
}
