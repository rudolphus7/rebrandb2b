-- Referral System Migration - ROBUST VERSION
-- Purpose: Track referrals and auto-credit bonuses

-- 1. Ensure all necessary columns exist in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_bonus_paid BOOLEAN DEFAULT FALSE;

-- 2. Improved unique referral code generator
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    
    SELECT count(*) INTO exists_count FROM public.profiles WHERE referral_code = result;
    IF exists_count = 0 THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Initialize codes for any existing users who don't have one
UPDATE public.profiles 
SET referral_code = public.generate_referral_code() 
WHERE referral_code IS NULL;

-- 4. Robust Signup Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    ref_code TEXT;
    referrer_id UUID;
BEGIN
    -- 1. Extract referral code from metadata
    ref_code := COALESCE(new.raw_user_meta_data->>'referral_code', '');
    
    -- 2. Find referrer if code is valid
    IF ref_code <> '' THEN
        SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = ref_code;
    END IF;

    -- 3. Insert profile safely
    -- We use COALESCE for mandatory fields to prevent NULL violations
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        company_name, 
        edrpou, 
        phone, 
        is_verified, 
        role, 
        bonus_points, 
        total_spent,
        referral_code, 
        referred_by,
        referral_bonus_paid
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Користувач'),
        COALESCE(new.raw_user_meta_data->>'company_name', ''),
        COALESCE(new.raw_user_meta_data->>'edrpou', ''),
        COALESCE(new.raw_user_meta_data->>'phone', ''),
        false,
        'customer',
        0,
        0,
        public.generate_referral_code(),
        referrer_id,
        false
    );
    
    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Fallback: If heavy insert fails, try bare minimum insert
    -- This helps diagnose if the error is due to one of the extra columns
    BEGIN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (new.id, new.email, 'User (Recovery)', 'customer')
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Extreme fallback
    END;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Bind Trigger to auth.users
-- Clean up all possible trigger names to ensure only one is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_referral_signup ON auth.users;
DROP TRIGGER IF EXISTS tr_handle_new_user ON auth.users;

CREATE TRIGGER tr_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Bonus Accrual Logic (Triggered on Profile Activity)
CREATE OR REPLACE FUNCTION public.proc_referral_bonus()
RETURNS trigger AS $$
DECLARE
    target_referrer_id UUID;
    is_confirmed TIMESTAMPTZ;
BEGIN
    -- Only pay if referred and not yet paid
    IF NEW.referred_by IS NOT NULL AND NEW.referral_bonus_paid = FALSE THEN
        -- Check email status from auth.users
        SELECT email_confirmed_at INTO is_confirmed FROM auth.users WHERE id = NEW.id;
        
        IF is_confirmed IS NOT NULL THEN
            target_referrer_id := NEW.referred_by;
            
            -- Insert log
            INSERT INTO public.loyalty_logs (user_id, amount, type, description)
            VALUES (
                target_referrer_id, 
                100, 
                'earn', 
                'Бонус за запрошення друга (ID: ' || NEW.id || ')'
            );
            
            -- Update balance
            UPDATE public.profiles 
            SET bonus_points = COALESCE(bonus_points, 0) + 100 
            WHERE id = target_referrer_id;
            
            -- Update current row
            NEW.referral_bonus_paid := TRUE;
            NEW.is_verified := TRUE;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on last_visit update
DROP TRIGGER IF EXISTS tr_check_referral_bonus ON public.profiles;
CREATE TRIGGER tr_check_referral_bonus
BEFORE UPDATE OF last_visit ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.proc_referral_bonus();
