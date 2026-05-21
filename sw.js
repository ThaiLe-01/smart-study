// ===== Smart Study Hub — Service Worker =====
// Push notification nhắc học lúc 7h sáng & 8h tối

const ALL_ALARM_TIMES = [
    { key: 'morning', hour: 7,  minute: 0, label: '🌅 buổi sáng (7:00)' },
    { key: 'evening', hour: 20, minute: 0, label: '🌙 buổi tối (20:00)' },
];

// ─── Settings (được cập nhật từ page) ────────────────────────────────────
let _settings = { morning: true, evening: true };

// ─── Install ──────────────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());

// ─── Activate ─────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
    scheduleNextAlarms();
});

// ─── Message từ page ──────────────────────────────────────────────────────
self.addEventListener('message', event => {
    if (!event.data) return;
    const { type, morning, evening } = event.data;
    switch (type) {
        case 'UPDATE_SETTINGS':
            _settings = { morning: !!morning, evening: !!evening };
            scheduleNextAlarms();
            break;
        case 'SCHEDULE_ALARMS':
            scheduleNextAlarms();
            break;
        case 'CANCEL_ALARMS':
            cancelAlarms();
            break;
        case 'TEST_NOTIFICATION':
            fireNotification('🔔 Test thành công!', 'Push notification hoạt động bình thường ✅', 'test');
            break;
    }
});

// ─── Push từ server (nếu tích hợp sau) ───────────────────────────────────
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        fireNotification(
            data.title || '📚 Smart Study Hub',
            data.body  || 'Đến giờ học rồi! Hãy ôn từ vựng nhé 🎯',
            'push'
        )
    );
});

// ─── Notification click ───────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'snooze') {
        setTimeout(() => {
            fireNotification('⏰ Nhắc lại: Học ngay nào!', 'Đã đến giờ bạn đặt nhắc lại — mở app học thôi! 📚', 'snooze');
        }, 10 * 60 * 1000);
        return;
    }

    const url = (event.notification.data && event.notification.data.url) || './';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) {
                if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// ─── Periodic Background Sync ─────────────────────────────────────────────
self.addEventListener('periodicsync', event => {
    if (event.tag === 'study-reminder') {
        event.waitUntil(checkAndFireByTime());
    }
});

// ─── Alarm scheduler ─────────────────────────────────────────────────────
let _alarmTimeouts = [];

function cancelAlarms() {
    _alarmTimeouts.forEach(clearTimeout);
    _alarmTimeouts = [];
}

function scheduleNextAlarms() {
    cancelAlarms();
    const now = new Date();
    ALL_ALARM_TIMES.forEach(({ key, hour, minute, label }) => {
        if (!_settings[key]) return; // bỏ qua nếu tắt
        const delay = getNextOccurrence(now, hour, minute) - now;
        const tick = () => {
            fireNotification('📚 Đến giờ học rồi!', `Nhắc nhở ${label}: Hãy ôn từ vựng của bạn nhé! 🎯`, key);
            // Lặp lại sau 24h
            const t = setTimeout(tick, 24 * 60 * 60 * 1000);
            _alarmTimeouts.push(t);
        };
        const t = setTimeout(tick, delay);
        _alarmTimeouts.push(t);
    });
}

function getNextOccurrence(from, hour, minute) {
    const d = new Date(from);
    d.setHours(hour, minute, 0, 0);
    if (d <= from) d.setDate(d.getDate() + 1);
    return d;
}

function fireNotification(title, body, tag = 'study-reminder') {
    return self.registration.showNotification(title, {
        body,
        icon:      'smart.png',
        badge:     'smart.png',
        tag,
        renotify:  true,
        vibrate:   [200, 100, 200],
        data:      { url: './' },
        actions:   [
            { action: 'open',   title: '📖 Học ngay' },
            { action: 'snooze', title: '⏰ 10 phút nữa' },
        ],
    });
}

// Dùng với Periodic Sync — kiểm tra giờ thực tế
function checkAndFireByTime() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const match = ALL_ALARM_TIMES.find(a =>
        _settings[a.key] && a.hour === h && Math.abs(a.minute - m) <= 5
    );
    if (match) return fireNotification('📚 Đến giờ học rồi!', `Nhắc nhở ${match.label}`, match.key);
    return Promise.resolve();
}
