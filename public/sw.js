const CACHE = 'koryandik-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/logo.png']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/*
 * Hanya navigasi halaman yang ditangani. Permintaan data (Supabase, API) tetap
 * lewat jaringan apa adanya supaya tidak ada data basi yang tersaji.
 * Saat perangkat offline, tampilkan halaman penjelasan alih-alih layar galat
 * bawaan browser.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((r) => r || Response.error())
    )
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  let data = {
    title: 'Koryandik',
    body: 'Notifikasi baru',
    icon: '/logo.png',
    badge: '/logo.png',
    data: {}
  };
  
  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'view', title: 'Lihat' },
      { action: 'dismiss', title: 'Tutup' }
    ],
    requireInteraction: true,
    tag: 'koryandik-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'dismiss') return;

  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Fokuskan tab Koryandik yang sudah terbuka daripada menumpuk tab baru.
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
