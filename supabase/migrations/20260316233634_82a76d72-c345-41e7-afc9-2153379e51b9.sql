
-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agreements table
CREATE TABLE public.agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  scope_notes TEXT,
  duration TEXT,
  frequency TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_at TIMESTAMPTZ
);

-- Add validation trigger for service_type
CREATE OR REPLACE FUNCTION public.validate_service_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.service_type NOT IN ('annual_pm', 'due_diligence', 'survey', 'storm', 'construction_management') THEN
    RAISE EXCEPTION 'Invalid service_type: %', NEW.service_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_agreements_service_type
BEFORE INSERT OR UPDATE ON public.agreements
FOR EACH ROW EXECUTE FUNCTION public.validate_service_type();

-- Add validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_agreement_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'sent', 'signed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_agreements_status
BEFORE INSERT OR UPDATE ON public.agreements
FOR EACH ROW EXECUTE FUNCTION public.validate_agreement_status();

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients (authenticated users can CRUD)
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create clients"
ON public.clients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
ON public.clients FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete clients"
ON public.clients FOR DELETE TO authenticated USING (true);

-- RLS policies for agreements (authenticated users can CRUD)
CREATE POLICY "Authenticated users can view agreements"
ON public.agreements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create agreements"
ON public.agreements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update agreements"
ON public.agreements FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete agreements"
ON public.agreements FOR DELETE TO authenticated USING (true);
