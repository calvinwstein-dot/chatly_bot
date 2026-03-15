import { verifyToken, hasRole } from '../supabaseClient.js';

/**
 * Admin authentication middleware using Supabase JWT.
 * Expects Authorization: Bearer <access_token> header.
 * For static /admin routes, redirects to login page if no token (cookie-based).
 */
export async function adminAuth(req, res, next) {
  // For static file requests (HTML pages), check the supabase-auth-token cookie
  // The login page sets this cookie after successful Supabase auth
  const isStaticRequest = req.method === 'GET' && !req.path.startsWith('/api/');
  
  // Allow login.html to always be accessible
  if (req.path === '/login.html' || req.path === '/login') {
    return next();
  }

  // Extract token from Authorization header or cookie
  let token = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    // Parse supabase-auth-token from cookies
    const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
      const [key, ...val] = c.trim().split('=');
      acc[key] = val.join('=');
      return acc;
    }, {});
    token = cookies['supabase-auth-token'];
  }
  
  if (!token) {
    if (isStaticRequest) {
      return res.redirect('/admin/login.html');
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Verify the Supabase JWT
  const { user, error } = await verifyToken(token);
  
  if (error || !user) {
    if (isStaticRequest) {
      return res.redirect('/admin/login.html');
    }
    return res.status(401).json({ error: error || 'Invalid token' });
  }

  // Check admin role
  if (!hasRole(user, 'admin')) {
    if (isStaticRequest) {
      return res.redirect('/admin/login.html');
    }
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Attach user to request for downstream use
  req.user = user;
  next();
}
