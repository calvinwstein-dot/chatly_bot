import bcrypt from 'bcrypt';

// Simple authentication middleware for admin panel
export function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  // Check for Basic Auth
  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    // Check credentials (set these in your .env file)
    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    // If no hash is set, use legacy plaintext comparison with warning
    if (!validPasswordHash) {
      console.warn('⚠️  WARNING: Using plaintext password. Please set ADMIN_PASSWORD_HASH in .env');
      const validPassword = process.env.ADMIN_PASSWORD || 'changeme123';
      if (username === validUsername && password === validPassword) {
        return next();
      }
    } else {
      // Use bcrypt to compare password with hash
      if (username === validUsername && bcrypt.compareSync(password, validPasswordHash)) {
        return next();
      }
    }
  }
  
  // Request authentication
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
  res.status(401).send('Authentication required');
}

// Utility function to generate password hash (for setup)
export function generatePasswordHash(password) {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}
