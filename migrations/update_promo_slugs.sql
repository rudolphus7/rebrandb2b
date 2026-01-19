-- Prepend 'promo/' to all existing slugs in promo_pages
-- This ensures that links like /promo/sale continue to work
-- after we move to a root catch-all route.

UPDATE promo_pages
SET slug = 'promo/' || slug
WHERE slug NOT LIKE 'promo/%';
