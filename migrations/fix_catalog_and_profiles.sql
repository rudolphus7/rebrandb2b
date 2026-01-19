-- HOTFIX: Fix Catalog Stock Filter & Registration Issues
-- Run this in Supabase SQL Editor

-- ==========================================
-- 1. FIX PRODUCT VARIANTS SCHEMA
-- ==========================================
-- Ensure 'available' and 'stock' columns exist
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS available INTEGER DEFAULT 0;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- Backfill 'available' from 'stock' if it's 0 but stock is > 0
UPDATE public.product_variants 
SET available = stock 
WHERE available = 0 AND stock > 0;

-- ==========================================
-- 2. DEEP-CLEAN REGISTRATION TRIGGERS
-- ==========================================
-- Remove all possible conflicting triggers from auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_referral_signup ON auth.users;
DROP TRIGGER IF EXISTS tr_handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- ==========================================
-- 3. IMPROVED PROFILES SCHEMA
-- ==========================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_bonus_paid BOOLEAN DEFAULT FALSE;

-- ==========================================
-- 4. ROBUST REGISTRATION FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    ref_code TEXT;
    referrer_id UUID;
BEGIN
    -- 1. Get referral code from metadata
    ref_code := COALESCE(new.raw_user_meta_data->>'referral_code', '');
    
    -- 2. Find referrer
    IF ref_code <> '' THEN
        SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = ref_code;
    END IF;

    -- 3. Attempt Main Insert
    BEGIN
        INSERT INTO public.profiles (
            id, 
            email, 
            full_name, 
            company_name, 
            edrpou, 
            phone, 
            role, 
            bonus_points, 
            total_spent,
            referral_code, 
            referred_by
        )
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'full_name', 'Користувач (B2B)'),
            COALESCE(new.raw_user_meta_data->>'company_name', ''),
            COALESCE(new.raw_user_meta_data->>'edrpou', ''),
            COALESCE(new.raw_user_meta_data->>'phone', ''),
            'customer',
            0,
            0,
            public.generate_referral_code(), -- Uses previously defined helper
            referrer_id
        );
    EXCEPTION WHEN OTHERS THEN
        -- 4. EMERGENCY FALLBACK
        -- If above fails (e.g. unknown column), at least save the user ID and Email
        -- to prevent Auth from breaking.
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (new.id, new.email, 'User (Recovery Mode)', 'customer')
        ON CONFLICT (id) DO NOTHING;
    END;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RE-BIND THE TRIGGER
CREATE TRIGGER tr_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 6. ENSURE GENERATOR EXISTS
-- ==========================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    result := 'RBRND-' || '';
    FOR i IN 1..6 LOOP
      result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    
    SELECT count(*) INTO exists_count FROM public.profiles WHERE referral_code = result;
    IF exists_count = 0 THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
