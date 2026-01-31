-- Create table for constructor-specific orders
CREATE TABLE IF NOT EXISTS public.constructor_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_title TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price INTEGER NOT NULL,
    print_method TEXT,
    print_placement TEXT,
    print_size TEXT,
    design_preview TEXT, -- Base64 thumbnail of the final design
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_constructor_orders_user_id ON public.constructor_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_constructor_orders_created_at ON public.constructor_orders(created_at);

-- Enable RLS
ALTER TABLE public.constructor_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own constructor orders
DROP POLICY IF EXISTS "Users can see their own constructor orders" ON public.constructor_orders;
CREATE POLICY "Users can see their own constructor orders" 
ON public.constructor_orders FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own constructor orders
DROP POLICY IF EXISTS "Users can insert their own constructor orders" ON public.constructor_orders;
CREATE POLICY "Users can insert their own constructor orders" 
ON public.constructor_orders FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Admin can see all constructor orders
DROP POLICY IF EXISTS "Admins can see all constructor orders" ON public.constructor_orders;
CREATE POLICY "Admins can see all constructor orders" 
ON public.constructor_orders FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
