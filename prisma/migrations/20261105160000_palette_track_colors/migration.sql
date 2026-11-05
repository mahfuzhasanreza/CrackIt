-- Data migration: move the two default tracks from the original colors (blue #2563eb and
-- violet #7c3aed — indistinguishable for deuteranopes, ΔE 0.4) to validated palette slots.
-- Only touches tracks still using the untouched default color.
UPDATE "tracks" SET "color" = '#2a78d6' WHERE "color" = '#2563eb' AND "name" = 'SWE / Full-Stack';
UPDATE "tracks" SET "color" = '#eb6834' WHERE "color" = '#7c3aed' AND "name" = 'University Lecturer';
