-- Add link column to banners table
ALTER TABLE banners ADD COLUMN IF NOT EXISTS link text;

-- Create promo_pages table
CREATE TABLE IF NOT EXISTS promo_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  content text, -- store HTML content
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for promo_pages (optional but good practice)
ALTER TABLE promo_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public pages are viewable by everyone" ON promo_pages
  FOR SELECT USING (true);

-- Allow admin full access (assuming admin uses service role or authenticated user RLS)
-- Ideally you would restriction modification to specific roles, 
-- but for now we follow existing patterns (likely public read, authenticated write).
CREATE POLICY "Authenticated users can insert/update pages" ON promo_pages
  FOR ALL USING (auth.role() = 'authenticated');
