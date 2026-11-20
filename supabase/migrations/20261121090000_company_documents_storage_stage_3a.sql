-- Stage 3-A: private Storage bucket for company business attachments.
--
-- * Bucket is private: no public URL, no storage.objects policies for anon /
--   authenticated. Only the company-api Edge Function (service role) can
--   create signed upload/download URLs or delete objects.
-- * File metadata stays in public.company_records (record_type = 'file');
--   binary content lives only in Storage.
-- * Limits mirror the company-api allow-list: 10 MB per file and a fixed MIME
--   allow-list (PDF, images, plain text/CSV, common Office documents).

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-documents',
  'company-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
