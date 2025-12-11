const sessions = new Map();

export function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      history: [],
      leadInfo: {},
      supportInfo: {},
      lastIntent: null
    });
  }
  return sessions.get(sessionId);
}

export function updateSession(sessionId, updates) {
  const session = getSession(sessionId);
  const newSession = { ...session, ...updates };
  sessions.set(sessionId, newSession);
  return newSession;
}
