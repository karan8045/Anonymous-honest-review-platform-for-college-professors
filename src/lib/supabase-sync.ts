/**
 * Supabase Real-time Sync Adapter
 * Automatically syncs user signups, profiles, ratings, and opinions to Supabase
 * when NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY are provided.
 */

interface SupabaseConfig {
  url?: string;
  key?: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
}

/**
 * Format string institution IDs (e.g. 'inst-in-cusb') to Supabase hex UUID
 */
export function toSupabaseInstitutionId(id?: string | null): string | null {
  if (!id) return null;
  // If already a valid standard UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  // Convert slug to deterministic 32-char hex UUID format
  const hex = Buffer.from(id, 'utf8').toString('hex').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Sync user signup / profile to Supabase public.profiles
 */
export async function syncProfileToSupabase(profile: {
  id: string;
  username: string;
  name?: string;
  avatar: string;
  country: string;
  institution_id?: string;
}): Promise<{ synced: boolean; error?: string }> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return { synced: false, error: 'Supabase credentials not configured' };
  }

  try {
    const formattedInstitutionId = toSupabaseInstitutionId(profile.institution_id);
    const res = await fetch(`${url}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: profile.id,
        username: profile.username,
        name: profile.name || profile.username,
        avatar: profile.avatar,
        country: profile.country,
        institution_id: formattedInstitutionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('⚠️ Supabase profile sync warning:', err);
      return { synced: false, error: err };
    }

    console.log(`✅ Synced signup for @${profile.username} to Supabase successfully`);
    return { synced: true };
  } catch (err: any) {
    console.warn('⚠️ Supabase profile sync error:', err.message);
    return { synced: false, error: err.message };
  }
}

/**
 * Sync rating to Supabase public.ratings
 */
export async function syncRatingToSupabase(rating: {
  id: string;
  institution_id: string;
  user_id: string;
  username?: string;
  name?: string;
  score: number;
}): Promise<{ synced: boolean; error?: string }> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return { synced: false };

  try {
    const formattedInstitutionId = toSupabaseInstitutionId(rating.institution_id);
    const res = await fetch(`${url}/rest/v1/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: rating.id,
        institution_id: formattedInstitutionId,
        user_id: rating.user_id,
        username: rating.username || null,
        name: rating.name || null,
        score: rating.score,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    return { synced: res.ok };
  } catch (err: any) {
    console.warn('⚠️ Supabase rating sync error:', err.message);
    return { synced: false, error: err.message };
  }
}

/**
 * Sync opinion to Supabase public.opinions
 */
export async function syncOpinionToSupabase(opinion: {
  id: string;
  institution_id: string;
  user_id: string;
  username?: string;
  name?: string;
  content: string;
}): Promise<{ synced: boolean; error?: string }> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return { synced: false };

  try {
    const formattedInstitutionId = toSupabaseInstitutionId(opinion.institution_id);
    const res = await fetch(`${url}/rest/v1/opinions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        id: opinion.id,
        institution_id: formattedInstitutionId,
        user_id: opinion.user_id,
        username: opinion.username || null,
        name: opinion.name || null,
        content: opinion.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    return { synced: res.ok };
  } catch (err: any) {
    console.warn('⚠️ Supabase opinion sync error:', err.message);
    return { synced: false, error: err.message };
  }
}
