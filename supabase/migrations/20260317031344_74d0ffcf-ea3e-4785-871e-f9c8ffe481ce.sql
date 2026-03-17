
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements', 'agreements', true);

CREATE POLICY "Allow public read access on agreements" ON storage.objects FOR SELECT USING (bucket_id = 'agreements');

CREATE POLICY "Allow service role and authenticated upload on agreements" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'agreements');

CREATE POLICY "Allow service role and authenticated update on agreements" ON storage.objects FOR UPDATE USING (bucket_id = 'agreements');
