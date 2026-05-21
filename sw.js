// Smart Study Hub - Service Worker
// Phiên bản cache — tăng số này mỗi khi bạn cập nhật file
const CACHE_NAME = 'smart-study-v1';

// Các file sẽ được lưu vào bộ nhớ để dùng offline
const ASSETS = [
  './index.html',
  './manifest.json',
  './smart.png'
];

// Cài đặt: lưu cache các file cần thiết
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Kích hoạt: xóa cache cũ nếu có
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: ưu tiên cache, fallback về mạng
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
