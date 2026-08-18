CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  links TEXT[] NOT NULL DEFAULT '{}',
  skills TEXT[] NOT NULL DEFAULT '{}',
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  years_experience NUMERIC,
  raw_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Public can insert candidates" ON public.candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update candidates" ON public.candidates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete candidates" ON public.candidates FOR DELETE USING (true);

CREATE INDEX candidates_created_at_idx ON public.candidates (created_at DESC);
CREATE INDEX candidates_skills_idx ON public.candidates USING GIN (skills);