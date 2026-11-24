self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            return caches.delete(cacheName);
          }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

// Privacy-by-design Web Push handler: displays safe summary only (never exact street address).
self.addEventListener("push", function (event) {
  let payload = {
    title: "ILOLIT értesítés",
    body: "Megtekintésed állapota frissült. Koppints a részletekért.",
    webUrl: "/dashboard/bookings/properties",
    deepLink: "ilolit://appointments",
  };
  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = Object.assign(payload, parsed);
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.appointmentId ? "ilolit-appt-" + payload.appointmentId : "ilolit-notif",
      renotify: true,
      data: {
        webUrl: payload.webUrl || "/dashboard/bookings/properties",
        deepLink: payload.deepLink || "",
        appointmentId: payload.appointmentId || "",
      },
    }),
  );
});

// Deep-link click handler: navigates directly to the specific appointment detail page.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.webUrl) || "/dashboard/bookings/properties";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
