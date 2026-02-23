// Service Worker for Push Notifications - ZECOHO

const CACHE_NAME = 'zecoho-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'ZECOHO',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'zecoho-notification',
    data: { url: '/' },
    actions: [],
    requireInteraction: false,
    urgency: 'normal',
  };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: payload.data || data.data,
        actions: payload.actions || [],
        requireInteraction: payload.requireInteraction || false,
        urgency: payload.urgency || 'normal',
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }

  const isUrgent = data.urgency === 'high' || (data.data && data.data.type === 'urgent_booking');
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    actions: data.actions,
    requireInteraction: data.requireInteraction || isUrgent,
    vibrate: isUrgent ? [500, 200, 500, 200, 500] : [200, 100, 200],
    renotify: isUrgent,
    silent: false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      if (isUrgent) {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type: 'URGENT_BOOKING_PUSH_RECEIVED',
              bookingId: data.data?.bookingId,
              bookingCode: data.data?.bookingCode,
            });
          });
        });
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const notifData = event.notification.data || {};
  const bookingId = notifData.bookingId;
  const action = event.action;
  
  if (action === 'accept_booking' && bookingId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'BOOKING_ACTION',
              action: 'accept',
              bookingId: bookingId,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(`/owner/bookings?highlight=${bookingId}&action=accept`);
        }
      })
    );
    return;
  }
  
  if (action === 'reject_booking' && bookingId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'BOOKING_ACTION',
              action: 'reject',
              bookingId: bookingId,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(`/owner/bookings?highlight=${bookingId}&action=reject`);
        }
      })
    );
    return;
  }
  
  const urlToOpen = notifData.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});
