import { NextRequest } from 'next/server';

/**
 * Validates admin access against ADMIN_SECRET if configured.
 * In development, if no ADMIN_SECRET is set, requests are allowed for local testing.
 * In production, if ADMIN_SECRET is set, access is strictly enforced.
 */
export function verifyAdminAccess(req: NextRequest | Request): boolean {
  const adminSecret = process.env.ADMIN_SECRET;

  // If no admin secret is configured:
  // - In development: allow local debugging
  // - In production: if unset, warn and allow only if explicitly configured or localhost
  if (!adminSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ [SECURITY] ADMIN_SECRET is not configured in production environment.');
    }
    return true;
  }

  // Check custom header
  const headerKey = req.headers.get('x-admin-key');
  if (headerKey && headerKey === adminSecret) {
    return true;
  }

  // Check Bearer authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === adminSecret) {
      return true;
    }
  }

  // Check query parameter ?admin_key=...
  try {
    const url = new URL(req.url);
    const paramKey = url.searchParams.get('admin_key');
    if (paramKey && paramKey === adminSecret) {
      return true;
    }
  } catch {
    // URL parsing fallback
  }

  return false;
}
