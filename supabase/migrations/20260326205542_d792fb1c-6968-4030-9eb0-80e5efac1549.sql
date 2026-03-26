ALTER TABLE agreements ADD COLUMN IF NOT EXISTS satellite_image_url text;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS annotation_data jsonb;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS annotation_image text;