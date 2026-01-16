-- Create a table to track customer activity
CREATE TABLE IF NOT EXISTS customer_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'ORDER'
    path TEXT,
    details JSONB, -- Stores things like product_name, category, price, device_type
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster querying by user and time
CREATE INDEX IF NOT EXISTS idx_customer_events_user_id ON customer_events(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_created_at ON customer_events(created_at DESC);

-- Enable RLS
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin can view all events
CREATE POLICY "Admins can view all events" ON customer_events
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );

-- Users can insert their own events (or anon users if we track them via cookie/session later, but for now restricted to auth users for CRM)
CREATE POLICY "Users can insert their own events" ON customer_events
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Optional: Allow users to see their own history? Usually not needed for exact raw logs, but possible.
CREATE POLICY "Users can view own events" ON customer_events
    FOR SELECT
    USING (auth.uid() = user_id);
