// Service worker de la plataforma: guarda los archivos de la app para que abra rápido
// y funcione como app instalada. Los datos (Supabase) nunca se guardan acá: siempre van a la red.
// La versión viene en la URL con que se registra (sw.js?v=...): cada publicación usa archivos nuevos
// y así el proxy de la universidad no puede devolver copias viejas.
const VERSION = new URL(self.location).searchParams.get('v') || 'dev';
const CACHE = 'age-app-' + VERSION;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/api.js', 'js/demo-api.js', 'js/ui.js', 'js/config.js', 'js/export.js',
  'js/views/login.js', 'js/views/dashboard.js', 'js/views/project.js', 'js/views/users.js',
  'js/views/report.js', 'js/views/turnos.js', 'js/views/sitio.js', 'js/views/eventos.js', 'js/views/evento.js',
  'js/views/tabs/summary.js', 'js/views/tabs/presentation.js', 'js/views/tabs/tasks.js', 'js/views/tabs/updates.js', 'js/views/tabs/milestones.js',
  'js/views/tabs/ensayos.js', 'js/views/tabs/team.js', 'js/views/tabs/files.js', 'js/views/tabs/inventory.js',
  'js/views/tabs/performance.js', 'js/views/tabs/activity.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png',
];
// Librerías y fuentes externas que también conviene guardar
const CDN = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  const urls = SHELL.map(u => /\.(js|css)$/.test(u) ? `${u}?v=${VERSION}` : u);
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(urls)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  // Solo archivos de la app y de los CDN. Supabase (datos, login, archivos) va siempre directo a la red.
  if (!(sameOrigin && url.pathname.startsWith(new URL(self.registration.scope).pathname)) && !CDN.includes(url.hostname)) return;
  // La vuelta del login trae un código en la URL: no tocar esas navegaciones
  if (req.mode === 'navigate' && url.searchParams.has('code')) return;

  event.respondWith(caches.open(CACHE).then(async (cache) => {
    // Librerías de CDN: tienen la versión en la URL, así que lo guardado nunca queda viejo
    if (!sameOrigin) {
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }
    // Archivos de la app: primero la red (siempre la última versión, sin mezclar módulos viejos
    // y nuevos) y lo guardado solo si no hay conexión
    const key = req.mode === 'navigate' ? 'index.html' : req;
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) cache.put(key, res.clone());
      return res;
    } catch {
      const cached = await cache.match(key, { ignoreSearch: true });
      if (cached) return cached;
      throw new Error('Sin conexión');
    }
  }));
});
