// Singleton — fetches Google Client ID once and caches it
let cachedGid = null;
let fetched = false;
const listeners = [];

export function getGoogleClientId() { return cachedGid; }

export function onGoogleReady(cb) {
  if (fetched) { cb(cachedGid); return; }
  listeners.push(cb);
}

// Fetch immediately when this module loads
fetch("/api/auth/google-config")
  .then(r => r.json())
  .then(d => {
    cachedGid = d.clientId || null;
    fetched = true;
    listeners.forEach(cb => cb(cachedGid));
    listeners.length = 0;
  })
  .catch(() => {
    cachedGid = null;
    fetched = true;
    listeners.forEach(cb => cb(null));
    listeners.length = 0;
  });
