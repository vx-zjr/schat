self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification('schat', {
      body: 'New message',
      data: payload,
      tag: payload.conversationId || 'schat-new-message'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/client/').catch(() => clients.openWindow('/')));
});
