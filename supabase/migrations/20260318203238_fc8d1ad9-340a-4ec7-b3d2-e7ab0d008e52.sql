DELETE FROM agreements;
DELETE FROM clients;
ALTER TABLE agreements DROP COLUMN service_type;
ALTER TABLE agreements ADD COLUMN service_types text[] NOT NULL DEFAULT '{}';
DROP FUNCTION IF EXISTS public.validate_service_type() CASCADE;