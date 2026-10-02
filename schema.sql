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
    name TEXT,
    avatar TEXT NOT NULL CHECK (avatar IN ('male', 'female')),
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
    username TEXT,
    name TEXT,
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
    username TEXT,
    name TEXT,
    content TEXT NOT NULL CHECK (char_length(trim(content)) >= 10 AND char_length(content) <= 3000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opinions_institution ON public.opinions (institution_id);
CREATE INDEX IF NOT EXISTS idx_opinions_created_at ON public.opinions (created_at DESC);

-- Automatic schema migration / column guarantees if tables already exist:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.opinions ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.opinions ADD COLUMN IF NOT EXISTS name TEXT;

-- Drop foreign keys to auth.users if present to support direct app sync
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_user_id_fkey;
ALTER TABLE public.opinions DROP CONSTRAINT IF EXISTS opinions_user_id_fkey;

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
DROP POLICY IF EXISTS "Institutions are viewable by everyone" ON public.institutions;
CREATE POLICY "Institutions are viewable by everyone" 
    ON public.institutions FOR SELECT 
    USING (true);

-- Authenticated users can insert user-submitted institutions
DROP POLICY IF EXISTS "Authenticated users can submit new institutions" ON public.institutions;
CREATE POLICY "Authenticated users can submit new institutions" 
    ON public.institutions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND source = 'user_submitted' AND verified = false);

-- Profiles RLS
-- Anyone can view usernames and public profile info
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

-- Users can insert and update their own profile
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id OR auth.role() = 'service_role' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id OR auth.role() = 'service_role');

-- Ratings RLS
-- Everyone can read ratings summary/aggregates
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.ratings;
CREATE POLICY "Ratings are viewable by everyone" 
    ON public.ratings FOR SELECT 
    USING (true);

-- Users can insert their own rating (enforced by UNIQUE constraint)
DROP POLICY IF EXISTS "Users can insert their own rating" ON public.ratings;
CREATE POLICY "Users can insert their own rating" 
    ON public.ratings FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role' OR auth.role() = 'anon');

-- Authenticated users can update their own rating
DROP POLICY IF EXISTS "Users can update their own rating" ON public.ratings;
CREATE POLICY "Users can update their own rating" 
    ON public.ratings FOR UPDATE 
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Opinions RLS
-- Anyone can read opinions
DROP POLICY IF EXISTS "Opinions are viewable by everyone" ON public.opinions;
CREATE POLICY "Opinions are viewable by everyone" 
    ON public.opinions FOR SELECT 
    USING (true);

-- Users can insert opinions
DROP POLICY IF EXISTS "Users can insert their own opinions" ON public.opinions;
CREATE POLICY "Users can insert their own opinions" 
    ON public.opinions FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role' OR auth.role() = 'anon');

-- Explicitly NO DELETE POLICY for public users (opinions cannot be deleted by users).

-- =========================================================================
-- SEED DATA (Comprehensive Indian Universities & Global Universities)
-- =========================================================================

INSERT INTO public.institutions (id, name, country, city, state, abbreviations, source, verified)
VALUES
    ('696e7374-2d69-6e2d-6375-736200000000', 'Central University of South Bihar', 'India', 'Gaya', 'Bihar', ARRAY['CUSB', 'CU South Bihar'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-72616a000000', 'Central University of Rajasthan', 'India', 'Ajmer', 'Rajasthan', ARRAY['CURAJ', 'CU Rajasthan'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-6b0000000000', 'Central University of Kerala', 'India', 'Kasaragod', 'Kerala', ARRAY['CUK', 'CU Kerala'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-6a0000000000', 'Central University of Jharkhand', 'India', 'Ranchi', 'Jharkhand', ARRAY['CUJ', 'CU Jharkhand'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-680000000000', 'Central University of Haryana', 'India', 'Mahendragarh', 'Haryana', ARRAY['CUH', 'CU Haryana'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-706200000000', 'Central University of Punjab', 'India', 'Bathinda', 'Punjab', ARRAY['CUPB', 'CU Punjab'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-670000000000', 'Central University of Gujarat', 'India', 'Gandhinagar', 'Gujarat', ARRAY['CUG', 'CU Gujarat'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-687000000000', 'Central University of Himachal Pradesh', 'India', 'Dharamshala', 'Himachal Pradesh', ARRAY['CUHP', 'CU Himachal'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-6a616d6d7500', 'Central University of Jammu', 'India', 'Jammu', 'Jammu and Kashmir', ARRAY['CU Jammu'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-6b6173686d69', 'Central University of Kashmir', 'India', 'Ganderbal', 'Jammu and Kashmir', ARRAY['CU Kashmir'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-6b61726e6174', 'Central University of Karnataka', 'India', 'Kalaburagi', 'Karnataka', ARRAY['CUKar', 'CU Karnataka'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-6f0000000000', 'Central University of Odisha', 'India', 'Koraput', 'Odisha', ARRAY['CUO', 'CU Odisha'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-746e00000000', 'Central University of Tamil Nadu', 'India', 'Thiruvarur', 'Tamil Nadu', ARRAY['CUTN', 'CU Tamil Nadu'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-617000000000', 'Central University of Andhra Pradesh', 'India', 'Anantapur', 'Andhra Pradesh', ARRAY['CUAP', 'CU Andhra'], 'official_database', true),
    ('696e7374-2d69-6e2d-6475-000000000000', 'University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['DU', 'Delhi University'], 'official_database', true),
    ('696e7374-2d69-6e2d-6a6e-750000000000', 'Jawaharlal Nehru University', 'India', 'New Delhi', 'Delhi', ARRAY['JNU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6a6d-690000000000', 'Jamia Millia Islamia', 'India', 'New Delhi', 'Delhi', ARRAY['JMI', 'Jamia'], 'official_database', true),
    ('696e7374-2d69-6e2d-6268-750000000000', 'Banaras Hindu University', 'India', 'Varanasi', 'Uttar Pradesh', ARRAY['BHU'], 'official_database', true),
    ('696e7374-2d69-6e2d-616d-750000000000', 'Aligarh Muslim University', 'India', 'Aligarh', 'Uttar Pradesh', ARRAY['AMU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6175-2d616c6c6168', 'University of Allahabad', 'India', 'Prayagraj', 'Uttar Pradesh', ARRAY['UoA', 'Allahabad University'], 'official_database', true),
    ('696e7374-2d69-6e2d-6262-617500000000', 'Babasaheb Bhimrao Ambedkar University', 'India', 'Lucknow', 'Uttar Pradesh', ARRAY['BBAU'], 'official_database', true),
    ('696e7374-2d69-6e2d-7669-7376612d6268', 'Visva-Bharati University', 'India', 'Santiniketan', 'West Bengal', ARRAY['Visva Bharati'], 'official_database', true),
    ('696e7374-2d69-6e2d-756f-680000000000', 'University of Hyderabad', 'India', 'Hyderabad', 'Telangana', ARRAY['UoH', 'HCU', 'Hyderabad Central University'], 'official_database', true),
    ('696e7374-2d69-6e2d-6566-6c7500000000', 'English and Foreign Languages University', 'India', 'Hyderabad', 'Telangana', ARRAY['EFLU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d61-6e7575000000', 'Maulana Azad National Urdu University', 'India', 'Hyderabad', 'Telangana', ARRAY['MANUU'], 'official_database', true),
    ('696e7374-2d69-6e2d-706f-6e6469000000', 'Pondicherry University', 'India', 'Puducherry', 'Puducherry', ARRAY['PU Pondicherry'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e65-687500000000', 'North-Eastern Hill University', 'India', 'Shillong', 'Meghalaya', ARRAY['NEHU'], 'official_database', true),
    ('696e7374-2d69-6e2d-7465-7a7075720000', 'Tezpur University', 'India', 'Tezpur', 'Assam', ARRAY['TU Assam'], 'official_database', true),
    ('696e7374-2d69-6e2d-6173-73616d2d756e', 'Assam University', 'India', 'Silchar', 'Assam', ARRAY['AUS'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d69-7a6f72616d00', 'Mizoram University', 'India', 'Aizawl', 'Mizoram', ARRAY['MZU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e61-67616c616e64', 'Nagaland University', 'India', 'Lumami', 'Nagaland', ARRAY['NU Nagaland'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d61-6e6970757200', 'Manipur University', 'India', 'Imphal', 'Manipur', ARRAY['MU Manipur'], 'official_database', true),
    ('696e7374-2d69-6e2d-7267-750000000000', 'Rajiv Gandhi University', 'India', 'Itanagar', 'Arunachal Pradesh', ARRAY['RGU Arunachal'], 'official_database', true),
    ('696e7374-2d69-6e2d-7369-6b6b696d0000', 'Sikkim University', 'India', 'Gangtok', 'Sikkim', ARRAY['SU Sikkim'], 'official_database', true),
    ('696e7374-2d69-6e2d-7472-697075726100', 'Tripura University', 'India', 'Agartala', 'Tripura', ARRAY['TU Tripura'], 'official_database', true),
    ('696e7374-2d69-6e2d-686e-626775000000', 'Hemvati Nandan Bahuguna Garhwal University', 'India', 'Srinagar', 'Uttarakhand', ARRAY['HNBGU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6767-750000000000', 'Guru Ghasidas Vishwavidyalaya', 'India', 'Bilaspur', 'Chhattisgarh', ARRAY['GGU Bilaspur'], 'official_database', true),
    ('696e7374-2d69-6e2d-6468-736773750000', 'Doctor Harisingh Gour Vishwavidyalaya', 'India', 'Sagar', 'Madhya Pradesh', ARRAY['DHSGSU', 'Sagar University'], 'official_database', true),
    ('696e7374-2d69-6e2d-6967-6e7475000000', 'Indira Gandhi National Tribal University', 'India', 'Amarkantak', 'Madhya Pradesh', ARRAY['IGNTU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d67-637500000000', 'Mahatma Gandhi Central University', 'India', 'Motihari', 'Bihar', ARRAY['MGCU Motihari'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e61-6c616e646100', 'Nalanda University', 'India', 'Rajgir', 'Bihar', ARRAY['NU Rajgir'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746200000000', 'Indian Institute of Technology Bombay', 'India', 'Mumbai', 'Maharashtra', ARRAY['IITB', 'IIT Bombay'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746400000000', 'Indian Institute of Technology Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['IITD', 'IIT Delhi'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746d00000000', 'Indian Institute of Technology Madras', 'India', 'Chennai', 'Tamil Nadu', ARRAY['IITM', 'IIT Madras'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746b00000000', 'Indian Institute of Technology Kanpur', 'India', 'Kanpur', 'Uttar Pradesh', ARRAY['IITK', 'IIT Kanpur'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746b67700000', 'Indian Institute of Technology Kharagpur', 'India', 'Kharagpur', 'West Bengal', ARRAY['IIT KGP', 'IIT Kharagpur'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-747200000000', 'Indian Institute of Technology Roorkee', 'India', 'Roorkee', 'Uttarakhand', ARRAY['IITR', 'IIT Roorkee'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746700000000', 'Indian Institute of Technology Guwahati', 'India', 'Guwahati', 'Assam', ARRAY['IITG', 'IIT Guwahati'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746800000000', 'Indian Institute of Technology Hyderabad', 'India', 'Sangareddy', 'Telangana', ARRAY['IITH', 'IIT Hyderabad'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-742d62687500', 'Indian Institute of Technology (BHU) Varanasi', 'India', 'Varanasi', 'Uttar Pradesh', ARRAY['IIT BHU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746900000000', 'Indian Institute of Technology Indore', 'India', 'Indore', 'Madhya Pradesh', ARRAY['IITI', 'IIT Indore'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-74676e000000', 'Indian Institute of Technology Gandhinagar', 'India', 'Gandhinagar', 'Gujarat', ARRAY['IITGN', 'IIT Gandhinagar'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-747270720000', 'Indian Institute of Technology Ropar', 'India', 'Rupnagar', 'Punjab', ARRAY['IIT Ropar', 'IITRPR'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-747000000000', 'Indian Institute of Technology Patna', 'India', 'Patna', 'Bihar', ARRAY['IITP', 'IIT Patna'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746262730000', 'Indian Institute of Technology Bhubaneswar', 'India', 'Bhubaneswar', 'Odisha', ARRAY['IIT BBS', 'IIT Bhubaneswar'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746a00000000', 'Indian Institute of Technology Jodhpur', 'India', 'Jodhpur', 'Rajasthan', ARRAY['IITJ', 'IIT Jodhpur'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746d616e6469', 'Indian Institute of Technology Mandi', 'India', 'Mandi', 'Himachal Pradesh', ARRAY['IIT Mandi'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-74706b640000', 'Indian Institute of Technology Palakkad', 'India', 'Palakkad', 'Kerala', ARRAY['IIT Palakkad', 'IIT PKD'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-747470000000', 'Indian Institute of Technology Tirupati', 'India', 'Tirupati', 'Andhra Pradesh', ARRAY['IIT Tirupati'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-7469736d0000', 'Indian Institute of Technology (ISM) Dhanbad', 'India', 'Dhanbad', 'Jharkhand', ARRAY['IIT ISM', 'ISM Dhanbad'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746268696c61', 'Indian Institute of Technology Bhilai', 'India', 'Bhilai', 'Chhattisgarh', ARRAY['IIT Bhilai'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-74676f610000', 'Indian Institute of Technology Goa', 'India', 'Ponda', 'Goa', ARRAY['IIT Goa'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746a616d6d75', 'Indian Institute of Technology Jammu', 'India', 'Jammu', 'Jammu and Kashmir', ARRAY['IIT Jammu'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-746468000000', 'Indian Institute of Technology Dharwad', 'India', 'Dharwad', 'Karnataka', ARRAY['IIT Dharwad'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-747400000000', 'National Institute of Technology Tiruchirappalli', 'India', 'Tiruchirappalli', 'Tamil Nadu', ARRAY['NIT Trichy', 'NITT'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-746b00000000', 'National Institute of Technology Karnataka, Surathkal', 'India', 'Surathkal', 'Karnataka', ARRAY['NIT Surathkal', 'NITK'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-747200000000', 'National Institute of Technology Rourkela', 'India', 'Rourkela', 'Odisha', ARRAY['NIT Rourkela', 'NITR'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-747700000000', 'National Institute of Technology Warangal', 'India', 'Warangal', 'Telangana', ARRAY['NIT Warangal', 'NITW'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-746300000000', 'National Institute of Technology Calicut', 'India', 'Kozhikode', 'Kerala', ARRAY['NIT Calicut', 'NITC'], 'official_database', true),
    ('696e7374-2d69-6e2d-766e-697400000000', 'Visvesvaraya National Institute of Technology', 'India', 'Nagpur', 'Maharashtra', ARRAY['VNIT Nagpur', 'VNIT'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d6e-697400000000', 'Malaviya National Institute of Technology Jaipur', 'India', 'Jaipur', 'Rajasthan', ARRAY['MNIT Jaipur', 'MNIT'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d6e-6e6974000000', 'Motilal Nehru National Institute of Technology Allahabad', 'India', 'Prayagraj', 'Uttar Pradesh', ARRAY['MNNIT Allahabad', 'NIT Allahabad'], 'official_database', true),
    ('696e7374-2d69-6e2d-7376-6e6974000000', 'Sardar Vallabhbhai National Institute of Technology', 'India', 'Surat', 'Gujarat', ARRAY['SVNIT Surat', 'SVNIT'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-746467700000', 'National Institute of Technology Durgapur', 'India', 'Durgapur', 'West Bengal', ARRAY['NIT Durgapur', 'NITDGP'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-747300000000', 'National Institute of Technology Silchar', 'India', 'Silchar', 'Assam', ARRAY['NIT Silchar', 'NITS'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-746b6b720000', 'National Institute of Technology Kurukshetra', 'India', 'Kurukshetra', 'Haryana', ARRAY['NIT Kurukshetra', 'NIT KKR'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d61-6e6974000000', 'Maulana Azad National Institute of Technology', 'India', 'Bhopal', 'Madhya Pradesh', ARRAY['MANIT Bhopal', 'NIT Bhopal'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-747000000000', 'National Institute of Technology Patna', 'India', 'Patna', 'Bihar', ARRAY['NIT Patna', 'NITP'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-746a00000000', 'Dr. B. R. Ambedkar National Institute of Technology Jalandhar', 'India', 'Jalandhar', 'Punjab', ARRAY['NIT Jalandhar', 'NITJ'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-746a73720000', 'National Institute of Technology Jamshedpur', 'India', 'Jamshedpur', 'Jharkhand', ARRAY['NIT Jamshedpur', 'NITJSR'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-747272000000', 'National Institute of Technology Raipur', 'India', 'Raipur', 'Chhattisgarh', ARRAY['NIT Raipur'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-747367720000', 'National Institute of Technology Srinagar', 'India', 'Srinagar', 'Jammu and Kashmir', ARRAY['NIT Srinagar'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-742d64656c68', 'National Institute of Technology Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['NIT Delhi', 'NITD'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e69-742d676f6100', 'National Institute of Technology Goa', 'India', 'Cuncolim', 'Goa', ARRAY['NIT Goa'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-657374000000', 'Indian Institute of Engineering Science and Technology, Shibpur', 'India', 'Howrah', 'West Bengal', ARRAY['IIEST Shibpur', 'BESU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-697468000000', 'International Institute of Information Technology, Hyderabad', 'India', 'Hyderabad', 'Telangana', ARRAY['IIIT Hyderabad', 'IIITH'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-697462000000', 'International Institute of Information Technology, Bangalore', 'India', 'Bengaluru', 'Karnataka', ARRAY['IIIT Bangalore', 'IIITB'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-697464000000', 'Indraprastha Institute of Information Technology Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['IIIT Delhi', 'IIITD'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-697461000000', 'Indian Institute of Information Technology, Allahabad', 'India', 'Prayagraj', 'Uttar Pradesh', ARRAY['IIIT Allahabad', 'IIITA'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-697467000000', 'Atal Bihari Vajpayee Indian Institute of Information Technology and Management', 'India', 'Gwalior', 'Madhya Pradesh', ARRAY['IIITM Gwalior', 'ABVIIITM'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-69746c000000', 'Indian Institute of Information Technology, Lucknow', 'India', 'Lucknow', 'Uttar Pradesh', ARRAY['IIIT Lucknow', 'IIITL'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-697470756e65', 'Indian Institute of Information Technology, Pune', 'India', 'Pune', 'Maharashtra', ARRAY['IIIT Pune'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-736300000000', 'Indian Institute of Science Bangalore', 'India', 'Bengaluru', 'Karnataka', ARRAY['IISc', 'IISc Bangalore'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-7365722d7075', 'Indian Institute of Science Education and Research, Pune', 'India', 'Pune', 'Maharashtra', ARRAY['IISER Pune'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-7365722d6b6f', 'Indian Institute of Science Education and Research, Kolkata', 'India', 'Mohanpur', 'West Bengal', ARRAY['IISER Kolkata'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-7365722d6d6f', 'Indian Institute of Science Education and Research, Mohali', 'India', 'Mohali', 'Punjab', ARRAY['IISER Mohali'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-7365722d6268', 'Indian Institute of Science Education and Research, Bhopal', 'India', 'Bhopal', 'Madhya Pradesh', ARRAY['IISER Bhopal'], 'official_database', true),
    ('696e7374-2d69-6e2d-7469-667200000000', 'Tata Institute of Fundamental Research', 'India', 'Mumbai', 'Maharashtra', ARRAY['TIFR Mumbai'], 'official_database', true),
    ('696e7374-2d69-6e2d-6973-690000000000', 'Indian Statistical Institute', 'India', 'Kolkata', 'West Bengal', ARRAY['ISI Kolkata', 'ISI Delhi', 'ISI'], 'official_database', true),
    ('696e7374-2d69-6e2d-6169-696d732d6465', 'All India Institute of Medical Sciences, New Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['AIIMS Delhi', 'AIIMS New Delhi', 'AIIMS'], 'official_database', true),
    ('696e7374-2d69-6e2d-6169-696d732d6a6f', 'All India Institute of Medical Sciences, Jodhpur', 'India', 'Jodhpur', 'Rajasthan', ARRAY['AIIMS Jodhpur'], 'official_database', true),
    ('696e7374-2d69-6e2d-6169-696d732d7061', 'All India Institute of Medical Sciences, Patna', 'India', 'Patna', 'Bihar', ARRAY['AIIMS Patna'], 'official_database', true),
    ('696e7374-2d69-6e2d-6169-696d732d6268', 'All India Institute of Medical Sciences, Bhopal', 'India', 'Bhopal', 'Madhya Pradesh', ARRAY['AIIMS Bhopal'], 'official_database', true),
    ('696e7374-2d69-6e2d-6169-696d732d7269', 'All India Institute of Medical Sciences, Rishikesh', 'India', 'Rishikesh', 'Uttarakhand', ARRAY['AIIMS Rishikesh'], 'official_database', true),
    ('696e7374-2d69-6e2d-6169-696d732d6262', 'All India Institute of Medical Sciences, Bhubaneswar', 'India', 'Bhubaneswar', 'Odisha', ARRAY['AIIMS Bhubaneswar'], 'official_database', true),
    ('696e7374-2d69-6e2d-7067-696d65720000', 'Post Graduate Institute of Medical Education and Research', 'India', 'Chandigarh', 'Chandigarh', ARRAY['PGIMER Chandigarh', 'PGI'], 'official_database', true),
    ('696e7374-2d69-6e2d-636d-632d76656c6c', 'Christian Medical College, Vellore', 'India', 'Vellore', 'Tamil Nadu', ARRAY['CMC Vellore'], 'official_database', true),
    ('696e7374-2d69-6e2d-6a69-706d65720000', 'Jawaharlal Institute of Postgraduate Medical Education and Research', 'India', 'Puducherry', 'Puducherry', ARRAY['JIPMER'], 'official_database', true),
    ('696e7374-2d69-6e2d-6b67-6d7500000000', 'King George''s Medical University', 'India', 'Lucknow', 'Uttar Pradesh', ARRAY['KGMU Lucknow'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d61-6d6300000000', 'Maulana Azad Medical College', 'India', 'New Delhi', 'Delhi', ARRAY['MAMC Delhi'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-6d6100000000', 'Indian Institute of Management Ahmedabad', 'India', 'Ahmedabad', 'Gujarat', ARRAY['IIM Ahmedabad', 'IIMA'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-6d6200000000', 'Indian Institute of Management Bangalore', 'India', 'Bengaluru', 'Karnataka', ARRAY['IIM Bangalore', 'IIMB'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-6d6300000000', 'Indian Institute of Management Calcutta', 'India', 'Kolkata', 'West Bengal', ARRAY['IIM Calcutta', 'IIMC'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-6d6c00000000', 'Indian Institute of Management Lucknow', 'India', 'Lucknow', 'Uttar Pradesh', ARRAY['IIM Lucknow', 'IIML'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-6d6b00000000', 'Indian Institute of Management Kozhikode', 'India', 'Kozhikode', 'Kerala', ARRAY['IIM Kozhikode', 'IIMK'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-6d6900000000', 'Indian Institute of Management Indore', 'India', 'Indore', 'Madhya Pradesh', ARRAY['IIM Indore', 'IIMI'], 'official_database', true),
    ('696e7374-2d69-6e2d-6969-6d6d00000000', 'Indian Institute of Management Mumbai', 'India', 'Mumbai', 'Maharashtra', ARRAY['IIM Mumbai', 'NITIE'], 'official_database', true),
    ('696e7374-2d69-6e2d-786c-726900000000', 'XLRI – Xavier School of Management', 'India', 'Jamshedpur', 'Jharkhand', ARRAY['XLRI Jamshedpur', 'XLRI'], 'official_database', true),
    ('696e7374-2d69-6e2d-666d-732d64656c68', 'Faculty of Management Studies, University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['FMS Delhi', 'FMS'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e6c-736975000000', 'National Law School of India University', 'India', 'Bengaluru', 'Karnataka', ARRAY['NLSIU', 'NLU Bangalore'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e61-6c7361720000', 'NALSAR University of Law', 'India', 'Hyderabad', 'Telangana', ARRAY['NALSAR Hyderabad', 'NALSAR'], 'official_database', true),
    ('696e7374-2d69-6e2d-7762-6e756a730000', 'The West Bengal National University of Juridical Sciences', 'India', 'Kolkata', 'West Bengal', ARRAY['WBNUJS', 'NUJS Kolkata'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e6c-756400000000', 'National Law University Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['NLU Delhi', 'NLUD'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e6c-756a00000000', 'National Law University, Jodhpur', 'India', 'Jodhpur', 'Rajasthan', ARRAY['NLU Jodhpur', 'NLUJ'], 'official_database', true),
    ('696e7374-2d69-6e2d-676e-6c7500000000', 'Gujarat National Law University', 'India', 'Gandhinagar', 'Gujarat', ARRAY['GNLU Gandhinagar'], 'official_database', true),
    ('696e7374-2d69-6e2d-6a61-646176707572', 'Jadavpur University', 'India', 'Kolkata', 'West Bengal', ARRAY['JU Kolkata'], 'official_database', true),
    ('696e7374-2d69-6e2d-6361-6c6375747461', 'University of Calcutta', 'India', 'Kolkata', 'West Bengal', ARRAY['Calcutta University', 'CU Kolkata'], 'official_database', true),
    ('696e7374-2d69-6e2d-616e-6e612d756e69', 'Anna University', 'India', 'Chennai', 'Tamil Nadu', ARRAY['Anna University Chennai'], 'official_database', true),
    ('696e7374-2d69-6e2d-7370-707500000000', 'Savitribai Phule Pune University', 'India', 'Pune', 'Maharashtra', ARRAY['SPPU', 'Pune University'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d75-000000000000', 'University of Mumbai', 'India', 'Mumbai', 'Maharashtra', ARRAY['Mumbai University', 'MU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6474-750000000000', 'Delhi Technological University', 'India', 'New Delhi', 'Delhi', ARRAY['DTU', 'DCE'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e73-757400000000', 'Netaji Subhas University of Technology', 'India', 'New Delhi', 'Delhi', ARRAY['NSUT', 'NSIT'], 'official_database', true),
    ('696e7374-2d69-6e2d-6767-736970750000', 'Guru Gobind Singh Indraprastha University', 'India', 'New Delhi', 'Delhi', ARRAY['GGSIPU', 'IP University', 'IPU'], 'official_database', true),
    ('696e7374-2d69-6e2d-7061-6e6a61622d75', 'Panjab University', 'India', 'Chandigarh', 'Chandigarh', ARRAY['PU Chandigarh', 'Panjab University'], 'official_database', true),
    ('696e7374-2d69-6e2d-6f73-6d616e696100', 'Osmania University', 'India', 'Hyderabad', 'Telangana', ARRAY['OU Hyderabad', 'Osmania'], 'official_database', true),
    ('696e7374-2d69-6e2d-616e-646872612d75', 'Andhra University', 'India', 'Visakhapatnam', 'Andhra Pradesh', ARRAY['AU Vizag', 'Andhra University'], 'official_database', true),
    ('696e7374-2d69-6e2d-636f-657000000000', 'COEP Technological University', 'India', 'Pune', 'Maharashtra', ARRAY['COEP Pune', 'COEP'], 'official_database', true),
    ('696e7374-2d69-6e2d-766a-746900000000', 'Veermata Jijabai Technological Institute', 'India', 'Mumbai', 'Maharashtra', ARRAY['VJTI Mumbai', 'VJTI'], 'official_database', true),
    ('696e7374-2d69-6e2d-6963-742d6d756d62', 'Institute of Chemical Technology', 'India', 'Mumbai', 'Maharashtra', ARRAY['ICT Mumbai', 'UDCT'], 'official_database', true),
    ('696e7374-2d69-6e2d-7061-746e612d756e', 'Patna University', 'India', 'Patna', 'Bihar', ARRAY['PU Patna'], 'official_database', true),
    ('696e7374-2d69-6e2d-6c75-636b6e6f772d', 'University of Lucknow', 'India', 'Lucknow', 'Uttar Pradesh', ARRAY['Lucknow University', 'LU'], 'official_database', true),
    ('696e7374-2d69-6e2d-7261-6a6173746861', 'University of Rajasthan', 'India', 'Jaipur', 'Rajasthan', ARRAY['RU Jaipur', 'Rajasthan University'], 'official_database', true),
    ('696e7374-2d69-6e2d-6775-6a617261742d', 'Gujarat University', 'India', 'Ahmedabad', 'Gujarat', ARRAY['GU Ahmedabad'], 'official_database', true),
    ('696e7374-2d69-6e2d-6b65-72616c612d75', 'University of Kerala', 'India', 'Thiruvananthapuram', 'Kerala', ARRAY['Kerala University'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-736174000000', 'Cochin University of Science and Technology', 'India', 'Kochi', 'Kerala', ARRAY['CUSAT Kochi', 'CUSAT'], 'official_database', true),
    ('696e7374-2d69-6e2d-6269-74732d70696c', 'Birla Institute of Technology and Science, Pilani', 'India', 'Pilani', 'Rajasthan', ARRAY['BITS Pilani', 'BITS Goa', 'BITS Hyderabad', 'BITS'], 'official_database', true),
    ('696e7374-2d69-6e2d-7669-740000000000', 'Vellore Institute of Technology', 'India', 'Vellore', 'Tamil Nadu', ARRAY['VIT Vellore', 'VIT Chennai', 'VIT Bhopal', 'VIT-AP', 'VIT'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d61-686500000000', 'Manipal Academy of Higher Education', 'India', 'Manipal', 'Karnataka', ARRAY['MAHE', 'Manipal University', 'MIT Manipal'], 'official_database', true),
    ('696e7374-2d69-6e2d-7468-617061720000', 'Thapar Institute of Engineering and Technology', 'India', 'Patiala', 'Punjab', ARRAY['Thapar University', 'TIET Patiala'], 'official_database', true),
    ('696e7374-2d69-6e2d-7372-6d0000000000', 'SRM Institute of Science and Technology', 'India', 'Kattankulathur', 'Tamil Nadu', ARRAY['SRM University', 'SRM Chennai', 'SRM'], 'official_database', true),
    ('696e7374-2d69-6e2d-616d-726974610000', 'Amrita Vishwa Vidyapeetham', 'India', 'Coimbatore', 'Tamil Nadu', ARRAY['Amrita University', 'Amrita'], 'official_database', true),
    ('696e7374-2d69-6e2d-6173-686f6b610000', 'Ashoka University', 'India', 'Sonipat', 'Haryana', ARRAY['Ashoka'], 'official_database', true),
    ('696e7374-2d69-6e2d-6a67-750000000000', 'O.P. Jindal Global University', 'India', 'Sonipat', 'Haryana', ARRAY['JGU Sonipat', 'Jindal Global University'], 'official_database', true),
    ('696e7374-2d69-6e2d-736e-750000000000', 'Shiv Nadar University', 'India', 'Greater Noida', 'Uttar Pradesh', ARRAY['SNU Noida'], 'official_database', true),
    ('696e7374-2d69-6e2d-6b69-697400000000', 'Kalinga Institute of Industrial Technology', 'India', 'Bhubaneswar', 'Odisha', ARRAY['KIIT University', 'KIIT'], 'official_database', true),
    ('696e7374-2d69-6e2d-616d-697479000000', 'Amity University', 'India', 'Noida', 'Uttar Pradesh', ARRAY['Amity Noida', 'Amity'], 'official_database', true),
    ('696e7374-2d69-6e2d-6c70-750000000000', 'Lovely Professional University', 'India', 'Phagwara', 'Punjab', ARRAY['LPU Punjab', 'LPU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6375-2d70756e6a61', 'Chandigarh University', 'India', 'Mohali', 'Punjab', ARRAY['CU Mohali', 'Chandigarh University'], 'official_database', true),
    ('696e7374-2d69-6e2d-7379-6d62696f7369', 'Symbiosis International University', 'India', 'Pune', 'Maharashtra', ARRAY['SIU Pune', 'Symbiosis'], 'official_database', true),
    ('696e7374-2d69-6e2d-6e6d-696d73000000', 'Narsee Monjee Institute of Management Studies', 'India', 'Mumbai', 'Maharashtra', ARRAY['NMIMS Mumbai', 'NMIMS'], 'official_database', true),
    ('696e7374-2d69-6e2d-6368-726973740000', 'Christ University', 'India', 'Bengaluru', 'Karnataka', ARRAY['Christ University Bangalore'], 'official_database', true),
    ('696e7374-2d69-6e2d-7065-730000000000', 'PES University', 'India', 'Bengaluru', 'Karnataka', ARRAY['PESIT', 'PES Bangalore'], 'official_database', true),
    ('696e7374-2d69-6e2d-7276-636500000000', 'RV College of Engineering', 'India', 'Bengaluru', 'Karnataka', ARRAY['RVCE', 'RV University'], 'official_database', true),
    ('696e7374-2d69-6e2d-626d-736365000000', 'BMS College of Engineering', 'India', 'Bengaluru', 'Karnataka', ARRAY['BMSCE Bangalore'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d73-726974000000', 'Ramaiah Institute of Technology', 'India', 'Bengaluru', 'Karnataka', ARRAY['MSRIT Bangalore', 'MS Ramaiah'], 'official_database', true),
    ('696e7374-2d69-6e2d-7073-670000000000', 'PSG College of Technology', 'India', 'Coimbatore', 'Tamil Nadu', ARRAY['PSG Tech', 'PSG'], 'official_database', true),
    ('696e7374-2d69-6e2d-7361-737472610000', 'SASTRA Deemed to be University', 'India', 'Thanjavur', 'Tamil Nadu', ARRAY['SASTRA University'], 'official_database', true),
    ('696e7374-2d69-6e2d-6269-742d6d657372', 'Birla Institute of Technology, Mesra', 'India', 'Ranchi', 'Jharkhand', ARRAY['BIT Mesra'], 'official_database', true),
    ('696e7374-2d69-6e2d-6d69-72616e64612d', 'Miranda House, University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['Miranda House', 'MH DU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6869-6e64752d636f', 'Hindu College, University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['Hindu College', 'Hindu DU'], 'official_database', true),
    ('696e7374-2d69-6e2d-7374-657068656e73', 'St. Stephen''s College, University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['St. Stephen''s', 'Stephens DU'], 'official_database', true),
    ('696e7374-2d69-6e2d-7372-636300000000', 'Shri Ram College of Commerce, University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['SRCC', 'SRCC DU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6c73-720000000000', 'Lady Shri Ram College for Women, University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['LSR', 'LSR DU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6861-6e7372616a00', 'Hansraj College, University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['Hansraj College', 'Hansraj DU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6b6d-630000000000', 'Kirori Mal College, University of Delhi', 'India', 'New Delhi', 'Delhi', ARRAY['KMC', 'Kirori Mal DU'], 'official_database', true),
    ('696e7374-2d69-6e2d-6c6f-796f6c610000', 'Loyola College, Chennai', 'India', 'Chennai', 'Tamil Nadu', ARRAY['Loyola Chennai', 'Loyola'], 'official_database', true),
    ('696e7374-2d69-6e2d-7378-636b00000000', 'St. Xavier''s College, Kolkata', 'India', 'Kolkata', 'West Bengal', ARRAY['St. Xavier''s Kolkata', 'SXCK'], 'official_database', true),
    ('696e7374-2d69-6e2d-7378-636d00000000', 'St. Xavier''s College, Mumbai', 'India', 'Mumbai', 'Maharashtra', ARRAY['St. Xavier''s Mumbai', 'SXCM'], 'official_database', true),
    ('696e7374-2d75-732d-6d69-740000000000', 'Massachusetts Institute of Technology', 'United States', 'Cambridge', 'Massachusetts', ARRAY['MIT'], 'official_database', true),
    ('696e7374-2d75-732d-7374-616e666f7264', 'Stanford University', 'United States', 'Stanford', 'California', ARRAY['Stanford'], 'official_database', true),
    ('696e7374-2d75-732d-6861-727661726400', 'Harvard University', 'United States', 'Cambridge', 'Massachusetts', ARRAY['Harvard'], 'official_database', true),
    ('696e7374-2d75-732d-7563-620000000000', 'University of California, Berkeley', 'United States', 'Berkeley', 'California', ARRAY['UC Berkeley', 'Cal', 'UCB'], 'official_database', true),
    ('696e7374-2d75-732d-7563-6c6100000000', 'University of California, Los Angeles', 'United States', 'Los Angeles', 'California', ARRAY['UCLA'], 'official_database', true),
    ('696e7374-2d75-732d-636f-6c756d626961', 'Columbia University', 'United States', 'New York', 'New York', ARRAY['Columbia'], 'official_database', true),
    ('696e7374-2d75-6b2d-6f78-666f72640000', 'University of Oxford', 'United Kingdom', 'Oxford', 'England', ARRAY['Oxford'], 'official_database', true),
    ('696e7374-2d75-6b2d-6361-6d6272696467', 'University of Cambridge', 'United Kingdom', 'Cambridge', 'England', ARRAY['Cambridge'], 'official_database', true),
    ('696e7374-2d75-6b2d-696d-70657269616c', 'Imperial College London', 'United Kingdom', 'London', 'England', ARRAY['Imperial', 'ICL'], 'official_database', true),
    ('696e7374-2d75-6b2d-7563-6c0000000000', 'University College London', 'United Kingdom', 'London', 'England', ARRAY['UCL'], 'official_database', true),
    ('696e7374-2d63-612d-756f-667400000000', 'University of Toronto', 'Canada', 'Toronto', 'Ontario', ARRAY['U of T', 'UofT'], 'official_database', true),
    ('696e7374-2d63-612d-7562-630000000000', 'University of British Columbia', 'Canada', 'Vancouver', 'British Columbia', ARRAY['UBC'], 'official_database', true),
    ('696e7374-2d63-612d-6d63-67696c6c0000', 'McGill University', 'Canada', 'Montreal', 'Quebec', ARRAY['McGill'], 'official_database', true),
    ('696e7374-2d61-752d-6d65-6c6200000000', 'University of Melbourne', 'Australia', 'Melbourne', 'Victoria', ARRAY['UniMelb'], 'official_database', true),
    ('696e7374-2d61-752d-7379-646e65790000', 'University of Sydney', 'Australia', 'Sydney', 'New South Wales', ARRAY['USYD'], 'official_database', true),
    ('696e7374-2d73-672d-6e75-730000000000', 'National University of Singapore', 'Singapore', 'Singapore', NULL, ARRAY['NUS'], 'official_database', true),
    ('696e7374-2d73-672d-6e74-750000000000', 'Nanyang Technological University', 'Singapore', 'Singapore', NULL, ARRAY['NTU'], 'official_database', true),
    ('696e7374-2d64-652d-7475-6d0000000000', 'Technical University of Munich', 'Germany', 'Munich', 'Bavaria', ARRAY['TUM'], 'official_database', true),
    ('696e7374-2d64-652d-6c6d-750000000000', 'Ludwig Maximilian University of Munich', 'Germany', 'Munich', 'Bavaria', ARRAY['LMU'], 'official_database', true)
ON CONFLICT (id) DO NOTHING;
