// Singleton — fetches Google Client ID once on module load
let cachedGid = null;
let fetched = false;
const listeners = [];

export function getGoogleClientId() { return cachedGid; }

export function onGoogleReady(cb) {
  if (fetched) { cb(cachedGid); return; }
  listeners.push(cb);
}

function resolve(id) {
  cachedGid = id || null;
  fetched = true;
  listeners.forEach(cb => cb(cachedGid));
  listeners.length = 0;
}

fetch("/api/auth/google-config")
  .then(r => r.json())
  .then(d => resolve(d.clientId))
  .catch(() => resolve(null));
