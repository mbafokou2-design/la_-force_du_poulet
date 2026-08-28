self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/serveur/"));
});

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp(__FIREBASE_CONFIG__);
firebase.messaging().onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Nouvelle commande";
  const options = {
    body: payload.notification?.body || "Une commande vient d'arriver.",
    icon: "/assets/images/logo.webp",
    badge: "/assets/images/logo.webp",
    vibrate: [300, 150, 300],
    requireInteraction: true,
    data: { url: "/serveur/" },
  };
  return self.registration.showNotification(title, options);
});
