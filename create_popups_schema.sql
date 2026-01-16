-- Create popups table
CREATE TABLE IF NOT EXISTS popups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, -- Internal name for admin reference
  title text, -- Appears in the popup
  content text, -- HTML or plain text body
  image_url text, 
  link_url text, -- Where the button leads
  btn_text text DEFAULT 'Детальніше',
  
  -- Targeting Rules
  display_pages text[] DEFAULT '{"*"}', -- Array of URL paths. "*" means all pages. e.g. ["/catalog", "/contact"]
  exclude_pages text[] DEFAULT '{}', -- Pages to hide the popup on
  
  -- Behavior
  trigger_type text DEFAULT 'timer', -- 'timer', 'scroll', 'exit'
  trigger_delay integer DEFAULT 3, -- seconds before showing
  frequency text DEFAULT 'session', -- 'session' (once per session), 'once' (forever), 'always'
  
  -- Appearance
  position text DEFAULT 'center', -- 'center' (modal), 'bottom_right' (toast), 'bottom_left'
  
  -- Status
  is_active boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public read access (site users need to see popups)
CREATE POLICY "Public popups are viewable by everyone" ON popups
  FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Authenticated users can manage popups" ON popups
  FOR ALL USING (auth.role() = 'authenticated');
