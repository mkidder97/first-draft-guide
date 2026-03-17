CREATE POLICY "Allow service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'agreements')
WITH CHECK (bucket_id = 'agreements');