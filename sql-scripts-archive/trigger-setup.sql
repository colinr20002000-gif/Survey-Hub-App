-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION trigger_process_document()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://okldykkmgmcjhgzysris.supabase.co/functions/v1/process-document',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
      body := json_build_object('record', to_jsonb(NEW))::text
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_document_upload ON storage.objects;
CREATE TRIGGER on_document_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'policy-documents')
  EXECUTE FUNCTION trigger_process_document();