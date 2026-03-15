import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Supabase auth will not work.');
}

// Server-side client using service_role key (bypasses RLS, can verify JWTs)
export const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Verify a Supabase access token and return the user
 * @param {string} token - The JWT access token from the client
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
export async function verifyToken(token) {
  if (!token) {
    return { user: null, error: 'No token provided' };
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, error: error?.message || 'Invalid token' };
    }
    return { user: data.user, error: null };
  } catch (err) {
    console.error('Supabase token verification error:', err);
    return { user: null, error: 'Token verification failed' };
  }
}

/**
 * Check if a user has a specific role in app_metadata
 * @param {object} user - Supabase user object
 * @param {string} role - Required role ('admin' or 'hr')
 * @returns {boolean}
 */
export function hasRole(user, role) {
  return user?.app_metadata?.role === role;
}
