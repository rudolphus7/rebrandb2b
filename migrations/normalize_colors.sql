-- Normalize colors in product_variants table based on the new COLOR_MAP keywords

-- 1. Reset 'Other' to ensure we re-evaluate everything
UPDATE product_variants SET general_color = 'Other';

-- 2. Apply mappings (Priority based on the order in COLOR_MAP)

-- Black
UPDATE product_variants 
SET general_color = 'Black' 
WHERE color ILIKE '%black%' 
   OR color ILIKE '%чорн%' 
   OR color ILIKE '%anthra%' 
   OR color ILIKE '%dark grey%' 
   OR color ILIKE '%charcoal%' 
   OR color ILIKE '%graphite%' 
   OR color ILIKE '%ebony%' 
   OR color ILIKE '%onyx%' 
   OR color ILIKE '%midnight%';

-- White
UPDATE product_variants 
SET general_color = 'White' 
WHERE color ILIKE '%white%' 
   OR color ILIKE '%біл%' 
   OR color ILIKE '%milk%' 
   OR color ILIKE '%snow%' 
   OR color ILIKE '%ivory%' 
   OR color ILIKE '%cream%' 
   OR color ILIKE '%antique white%' 
   OR color ILIKE '%alabaster%';

-- Grey
UPDATE product_variants 
SET general_color = 'Grey' 
WHERE (color ILIKE '%grey%' 
   OR color ILIKE '%gray%' 
   OR color ILIKE '%сір%' 
   OR color ILIKE '%ash%' 
   OR color ILIKE '%silver%' 
   OR color ILIKE '%steel%' 
   OR color ILIKE '%zinc%' 
   OR color ILIKE '%melange%' 
   OR color ILIKE '%heather%' 
   OR color ILIKE '%platinum%' 
   OR color ILIKE '%carbon%' 
   OR color ILIKE '%titanium%')
   AND general_color = 'Other';

-- Blue
UPDATE product_variants 
SET general_color = 'Blue' 
WHERE (color ILIKE '%blue%' 
   OR color ILIKE '%синій%' 
   OR color ILIKE '%блакит%' 
   OR color ILIKE '%navy%' 
   OR color ILIKE '%azure%' 
   OR color ILIKE '%royal%' 
   OR color ILIKE '%sky%' 
   OR color ILIKE '%indigo%' 
   OR color ILIKE '%denim%' 
   OR color ILIKE '%aqua%' 
   OR color ILIKE '%cyan%' 
   OR color ILIKE '%turquoise%' 
   OR color ILIKE '%teal%' 
   OR color ILIKE '%mint%' 
   OR color ILIKE '%petrol%' 
   OR color ILIKE '%ocean%' 
   OR color ILIKE '%cobalt%')
   AND general_color = 'Other';

-- Red
UPDATE product_variants 
SET general_color = 'Red' 
WHERE (color ILIKE '%red%' 
   OR color ILIKE '%червон%' 
   OR color ILIKE '%burgundy%' 
   OR color ILIKE '%maroon%' 
   OR color ILIKE '%cherry%' 
   OR color ILIKE '%brick%' 
   OR color ILIKE '%wine%' 
   OR color ILIKE '%bordeaux%' 
   OR color ILIKE '%cardinal%' 
   OR color ILIKE '%crimson%' 
   OR color ILIKE '%scarlet%' 
   OR color ILIKE '%ruby%' 
   OR color ILIKE '%fire%')
   AND general_color = 'Other';

-- Green
UPDATE product_variants 
SET general_color = 'Green' 
WHERE (color ILIKE '%green%' 
   OR color ILIKE '%зелен%' 
   OR color ILIKE '%olive%' 
   OR color ILIKE '%lime%' 
   OR color ILIKE '%khaki%' 
   OR color ILIKE '%military%' 
   OR color ILIKE '%forest%' 
   OR color ILIKE '%bottle%' 
   OR color ILIKE '%emerald%' 
   OR color ILIKE '%army%' 
   OR color ILIKE '%camou%' 
   OR color ILIKE '%fern%' 
   OR color ILIKE '%kelly%' 
   OR color ILIKE '%moss%' 
   OR color ILIKE '%sage%' 
   OR color ILIKE '%pistachio%' 
   OR color ILIKE '%seafoam%')
   AND general_color = 'Other';

-- Yellow
UPDATE product_variants 
SET general_color = 'Yellow' 
WHERE (color ILIKE '%yellow%' 
   OR color ILIKE '%жовт%' 
   OR color ILIKE '%gold%' 
   OR color ILIKE '%lemon%' 
   OR color ILIKE '%mustard%' 
   OR color ILIKE '%amber%' 
   OR color ILIKE '%maiz%' 
   OR color ILIKE '%sun%' 
   OR color ILIKE '%canary%')
   AND general_color = 'Other';

-- Orange
UPDATE product_variants 
SET general_color = 'Orange' 
WHERE (color ILIKE '%orange%' 
   OR color ILIKE '%помаранч%' 
   OR color ILIKE '%оранж%' 
   OR color ILIKE '%coral%' 
   OR color ILIKE '%peach%' 
   OR color ILIKE '%terracotta%' 
   OR color ILIKE '%rust%' 
   OR color ILIKE '%burnt%' 
   OR color ILIKE '%apricot%' 
   OR color ILIKE '%tangerine%')
   AND general_color = 'Other';

-- Purple
UPDATE product_variants 
SET general_color = 'Purple' 
WHERE (color ILIKE '%purple%' 
   OR color ILIKE '%фіолет%' 
   OR color ILIKE '%violet%' 
   OR color ILIKE '%lavender%' 
   OR color ILIKE '%lilac%' 
   OR color ILIKE '%plum%' 
   OR color ILIKE '%magenta%' 
   OR color ILIKE '%berry%' 
   OR color ILIKE '%eggplant%' 
   OR color ILIKE '%grape%')
   AND general_color = 'Other';

-- Pink
UPDATE product_variants 
SET general_color = 'Pink' 
WHERE (color ILIKE '%pink%' 
   OR color ILIKE '%рожев%' 
   OR color ILIKE '%rose%' 
   OR color ILIKE '%fuchsia%' 
   OR color ILIKE '%coral%' 
   OR color ILIKE '%salmon%' 
   OR color ILIKE '%blush%' 
   OR color ILIKE '%raspberry%' 
   OR color ILIKE '%strawberry%')
   AND general_color = 'Other';

-- Brown
UPDATE product_variants 
SET general_color = 'Brown' 
WHERE (color ILIKE '%brown%' 
   OR color ILIKE '%коричн%' 
   OR color ILIKE '%beige%' 
   OR color ILIKE '%sand%' 
   OR color ILIKE '%chocolate%' 
   OR color ILIKE '%coffee%' 
   OR color ILIKE '%camel%' 
   OR color ILIKE '%mocha%' 
   OR color ILIKE '%tan%' 
   OR color ILIKE '%taupe%' 
   OR color ILIKE '%khaki%' 
   OR color ILIKE '%wood%' 
   OR color ILIKE '%nut%' 
   OR color ILIKE '%caramel%' 
   OR color ILIKE '%cinnamon%')
   AND general_color = 'Other';

-- Metal
UPDATE product_variants 
SET general_color = 'Metal' 
WHERE (color ILIKE '%metal%' 
   OR color ILIKE '%silver%' 
   OR color ILIKE '%gold%' 
   OR color ILIKE '%chrome%' 
   OR color ILIKE '%copper%' 
   OR color ILIKE '%bronze%' 
   OR color ILIKE '%inox%' 
   OR color ILIKE '%alu%' 
   OR color ILIKE '%metallic%')
   AND general_color = 'Other';

-- Transparent
UPDATE product_variants 
SET general_color = 'Transparent' 
WHERE (color ILIKE '%transparent%' 
   OR color ILIKE '%прозор%' 
   OR color ILIKE '%clear%' 
   OR color ILIKE '%glass%')
   AND general_color = 'Other';

-- 3. Cleanup: Any remaining Standard or N/A should be 'Other'
UPDATE product_variants SET general_color = 'Other' WHERE general_color IS NULL OR color = 'Standard' OR color = 'N/A';
