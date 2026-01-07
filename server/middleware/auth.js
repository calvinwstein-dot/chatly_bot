// Simple authentication middleware for admin panel
export function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    // Check for Basic Auth
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.split(' ')[1];
      
      // Validate that credentials exist
      if (!base64Credentials) {
        throw new Error('Missing credentials');
      }
      
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [username, password] = credentials.split(':');
      
      // Check credentials (set these in your .env file)
      const validUsername = process.env.ADMIN_USERNAME || 'admin';
      const validPassword = process.env.ADMIN_PASSWORD || 'changeme123';
      
      if (username === validUsername && password === validPassword) {
        return next();
      }
    }
  } catch (error) {
    console.error('Authentication error:', error.message);
  }
  
  // Request authentication (either auth failed or error occurred)
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
  res.status(401).send('Authentication required');
}
