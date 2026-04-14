const CACHE_NAME = 'medpulse-v2';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './medpulse-icon.png'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request))
    );
});

// Push notification handler (for cross-device push)
self.addEventListener('push', e => {
    const data = e.data ? e.data.json() : { title: 'MedPulse Reminder', body: 'Time to take your medication!' };
    e.waitUntil(
        self.registration.showNotification(`🩺 ${data.title}`, {
            body: data.body,
            icon: './medpulse-icon.png',
            badge: './medpulse-icon.png',
            vibrate: [200, 100, 200],
            tag: 'medpulse-reminder',
            actions: [
                { action: 'take',  title: '✓ Mark Taken' },
                { action: 'snooze', title: '⏰ Snooze' }
            ]
        })
    );
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(clients.openWindow('./index.html'));
});
