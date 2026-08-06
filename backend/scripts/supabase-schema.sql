-- WebTrack Supabase Database Schema
-- Paste this script directly into your Supabase SQL Editor and click RUN.

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT DEFAULT 'Direct',
  company TEXT,
  address TEXT,
  gstin TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  website_name TEXT NOT NULL,
  website_url TEXT,
  stage TEXT DEFAULT 'Discovery',
  priority TEXT DEFAULT 'Medium',
  deadline TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  total_price NUMERIC DEFAULT 0,
  gst_enabled BOOLEAN DEFAULT FALSE,
  gst_rate NUMERIC DEFAULT 18,
  due_date TIMESTAMPTZ,
  history JSONB DEFAULT '[]'::jsonb,
  paid_webhook_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Domains Table
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  domain_name TEXT,
  price NUMERIC DEFAULT 0,
  provider TEXT DEFAULT 'GoDaddy',
  purchase_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT UNIQUE NOT NULL,
  client_id TEXT,
  type TEXT DEFAULT 'system',
  action TEXT NOT NULL,
  message TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Team Member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Employee Payments Table
CREATE TABLE IF NOT EXISTS public.employee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT UNIQUE NOT NULL,
  employee_id TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  date TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) and allow public API access for backend
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access for service" ON public.admins FOR ALL USING (true);
CREATE POLICY "Allow full access for service" ON public.clients FOR ALL USING (true);
CREATE POLICY "Allow full access for service" ON public.projects FOR ALL USING (true);
CREATE POLICY "Allow full access for service" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow full access for service" ON public.domains FOR ALL USING (true);
CREATE POLICY "Allow full access for service" ON public.activities FOR ALL USING (true);
CREATE POLICY "Allow full access for service" ON public.employees FOR ALL USING (true);
CREATE POLICY "Allow full access for service" ON public.employee_payments FOR ALL USING (true);
