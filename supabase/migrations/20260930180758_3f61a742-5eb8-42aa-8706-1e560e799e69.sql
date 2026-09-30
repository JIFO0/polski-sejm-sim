ALTER TABLE public.feedback
  ADD COLUMN email text,
  ADD COLUMN rating smallint;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_email_length CHECK (email IS NULL OR char_length(email) <= 254),
  ADD CONSTRAINT feedback_rating_range CHECK (rating IS NULL OR rating BETWEEN 1 AND 10);