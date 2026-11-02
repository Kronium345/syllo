-- prompts/15: lesson videos live in a private Cloudflare R2 bucket. `video_key` is the object
-- key there; the `lesson-video` Edge Function signs a 1-hour link for learners who can read
-- this row (the existing RLS: preview lessons or enrolled courses). `video_url` stays for
-- outside links. No policy change: whoever may read the row may get its video.
alter table public.lesson_contents add column video_key text;

comment on column public.lesson_contents.video_key is
  'Object key in the private R2 bucket (e.g. clips/<name>.mp4). Preferred over video_url; played through a signed link from the lesson-video Edge Function.';
