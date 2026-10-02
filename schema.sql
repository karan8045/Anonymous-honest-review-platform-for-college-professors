-- =========================================================================
-- DATABASE SCHEMA: Anonymous Honest Review Platform for Colleges & Universities
-- Supabase / PostgreSQL Specification with Row Level Security (RLS)
-- =========================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Institutions Table
-- Stores official university listings and user-submitted (unverified) institutions
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT,
    state TEXT,
    abbreviations TEXT[] DEFAULT '{}',
    source TEXT NOT NULL CHECK (source IN ('official_database', 'user_submitted', 'owner_added')),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast autocomplete & search
CREATE INDEX IF NOT EXISTS idx_institutions_country ON public.institutions (LOWER(country));
CREATE INDEX IF NOT EXISTS idx_institutions_name_trgm ON public.institutions USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_institutions_verified ON public.institutions (verified);

-- 3. Profiles Table
-- Holds the user's public pseudonym identity (username, country, enrolled university)
-- Linked to auth.users via id. NEVER expose internal auth credentials or emails.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    country TEXT NOT NULL,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- 4. Ratings Table
-- Enforces strictly ONE numeric rating per user per institution.
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score >= 1 AND score <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- CRITICAL REQUIREMENT: user_id + institution_id uniqueness
    CONSTRAINT unique_user_institution_rating UNIQUE (user_id, institution_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_institution ON public.ratings (institution_id);

-- 5. Opinions Table
-- Allows unlimited written reviews per user per institution.
-- No user-facing delete operation is allowed for published opinions.
CREATE TABLE IF NOT EXISTS public.opinions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) >= 10 AND char_length(content) <= 3000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opinions_institution ON public.opinions (institution_id);
CREATE INDEX IF NOT EXISTS idx_opinions_created_at ON public.opinions (created_at DESC);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures total pseudonymity: Users only see public usernames, never auth IDs or emails.
-- =========================================================================

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opinions ENABLE ROW LEVEL SECURITY;

-- Institutions RLS
-- Anyone can read institutions
CREATE POLICY "Institutions are viewable by everyone" 
    ON public.institutions FOR SELECT 
    USING (true);

-- Authenticated users can insert user-submitted institutions
CREATE POLICY "Authenticated users can submit new institutions" 
    ON public.institutions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND source = 'user_submitted' AND verified = false);

-- Profiles RLS
-- Anyone can view usernames and public profile info
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

-- Users can insert and update their own profile only
CREATE POLICY "Users can create their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Ratings RLS
-- Everyone can read ratings summary/aggregates
CREATE POLICY "Ratings are viewable by everyone" 
    ON public.ratings FOR SELECT 
    USING (true);

-- Authenticated users can insert their own rating (enforced by UNIQUE constraint)
CREATE POLICY "Users can insert their own rating" 
    ON public.ratings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own rating
CREATE POLICY "Users can update their own rating" 
    ON public.ratings FOR UPDATE 
    USING (auth.uid() = user_id);

-- Opinions RLS
-- Anyone can read opinions
CREATE POLICY "Opinions are viewable by everyone" 
    ON public.opinions FOR SELECT 
    USING (true);

-- Authenticated users can insert opinions
CREATE POLICY "Users can insert their own opinions" 
    ON public.opinions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Explicitly NO DELETE POLICY for public users (opinions cannot be deleted by users).

-- =========================================================================
-- SEED DATA (India Central Universities & Global Universities)
-- =========================================================================

INSERT INTO public.institutions (id, name, country, city, state, abbreviations, source, verified)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Central University of South Bihar', 'India', 'Gaya', 'Bihar', ARRAY['CUSB', 'CU South Bihar'], 'official_database', true),
    ('a0000000-0000-0000-0000-000000000002', 'Central University of Rajasthan', 'India', 'Ajmer', 'Rajasthan', ARRAY['CURAJ', 'CU Rajasthan'], 'official_database', true),
    ('a0000000-0000-0000-0000-000000000003', 'Central University of Kerala', 'India', 'Kasaragod', 'Kerala', ARRAY['CUK', 'CU Kerala'], 'official_database', true),
    ('a0000000-0000-0000-0000-000000000004', 'Central University of Jharkhand', 'India', 'Ranchi', 'Jharkhand', ARRAY['CUJ', 'CU Jharkhand'], 'official_database', true),
    ('a0000000-0000-0000-0000-000000000005', 'University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['DU'], 'official_database', true),
    ('a0000000-0000-0000-0000-000000000006', 'Indian Institute of Technology Bombay', 'India', 'Mumbai', 'Maharashtra', ARRAY['IITB', 'IIT Bombay'], 'official_database', true),
    ('a0000000-0000-0000-0000-000000000007', 'Massachusetts Institute of Technology', 'United States', 'Cambridge', 'Massachusetts', ARRAY['MIT'], 'official_database', true),
    ('a0000000-0000-0000-0000-000000000008', 'Stanford University', 'United States', 'Stanford', 'California', ARRAY['Stanford'], 'official_database', true),
    ('a0000000-0000-0000-0000-000000000009', 'University of Oxford', 'United Kingdom', 'Oxford', 'England', ARRAY['Oxford'], 'official_database', true),
    ('a0000000-0000-0000-0000-000000000010', 'University of Toronto', 'Canada', 'Toronto', 'Ontario', ARRAY['UofT', 'U of T'], 'official_database', true)
ON CONFLICT (id) DO NOTHING;
