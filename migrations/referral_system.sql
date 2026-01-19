-- Referral System Migration

-- 1. Add columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- 2. Function to generate random unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code() 
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  done BOOL;
BEGIN
  done := false;
  WHILE NOT done LOOP
    new_code := 'RBRND-' || upper(substring(md5(random()::text) from 1 for 6));
    BEGIN
      SELECT count(*) = 0 INTO done FROM public.profiles WHERE referral_code = new_code;
    EXCEPTION WHEN OTHERS THEN
      done := false;
    END;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 3. Initialize existing profiles with codes
UPDATE public.profiles 
SET referral_code = generate_referral_code() 
WHERE referral_code IS NULL;

-- 4. Update handle_new_user trigger to handle referred_by
-- First, let's see the current trigger if possible, or just overwrite it robustly.
-- Based on standard patterns, it likely looks like this:

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    ref_code TEXT;
    referrer_id UUID;
BEGIN
    -- Extract referral_code from raw_user_meta_data if present
    ref_code := (new.raw_user_meta_data->>'referral_code');
    
    IF ref_code IS NOT NULL THEN
        SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = ref_code;
    END IF;

    INSERT INTO public.profiles (id, full_name, company_name, edrpou, phone, is_verified, referral_code, referred_by)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'company_name',
        new.raw_user_meta_data->>'edrpou',
        new.raw_user_meta_data->>'phone',
        false,
        generate_referral_code(), -- Generate their own code
        referrer_id               -- Link to referrer
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
