// API Key authentication middleware for widget access
export function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    console.warn(`⚠️  API request without key from: ${req.ip}`);
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Get valid API keys from environment (comma-separated)
  const validApiKeys = process.env.API_KEYS 
    ? process.env.API_KEYS.split(',').map(key => key.trim())
    : [];
  
  if (validApiKeys.length === 0) {
    console.warn('⚠️  WARNING: No API_KEYS configured in .env. Widget authentication disabled.');
    return next(); // Allow through if no keys configured (for backward compatibility)
  }
  
  if (validApiKeys.includes(apiKey)) {
    return next();
  }
  
  console.warn(`⚠️  Invalid API key attempt from: ${req.ip}`);
  return res.status(403).json({ error: 'Invalid API key' });
}

// Optional API key auth - warns but allows through if not configured
export function optionalApiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.API_KEYS 
    ? process.env.API_KEYS.split(',').map(key => key.trim())
    : [];
  
  console.log('🔑 API Key Check:', {
    hasApiKey: !!apiKey,
    apiKey: apiKey ? apiKey.substring(0, 3) + '***' : 'none',
    keysConfigured: validApiKeys.length,
    path: req.path
  });
  
  // If API keys are configured, enforce them
  if (validApiKeys.length > 0) {
    if (!apiKey) {
      console.warn(`⚠️  API request without key from: ${req.ip}`);
      return res.status(401).json({ error: 'API key required' });
    }
    
    if (!validApiKeys.includes(apiKey)) {
      console.warn(`⚠️  Invalid API key attempt from: ${req.ip}`);
      return res.status(403).json({ error: 'Invalid API key' });
    }
  }
  
  next();
}
