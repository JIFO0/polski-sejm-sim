CREATE TABLE public.shared_scenarios (
  id text PRIMARY KEY,
  name text NOT NULL,
  scenario jsonb NOT NULL,
  ip_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
GRANT ALL ON public.shared_scenarios TO service_role;
ALTER TABLE public.shared_scenarios ENABLE ROW LEVEL SECURITY;
CREATE INDEX shared_scenarios_ip_idx ON public.shared_scenarios (ip_hash, expires_at DESC);