import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";

const status = document.getElementById("status");
const loginForm = document.getElementById("loginForm");
const enableButton = document.getElementById("enableButton");

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Erreur de connexion.");
  return data;
}

async function enablePush() {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) throw new Error("Ce navigateur ne prend pas en charge les notifications.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Autorisation des notifications refusee.");
  const { firebaseConfig, vapidKey } = await request("/api/fcm/public-config");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  const messaging = getMessaging(initializeApp(firebaseConfig));
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Token FCM non genere.");
  await request("/api/fcm/tokens", { method: "POST", body: JSON.stringify({ token, device_label: navigator.userAgent.slice(0, 120) }) });
  onMessage(messaging, (payload) => { status.textContent = payload.notification?.body || "Nouvelle commande recue."; });
  status.textContent = "Notifications actives sur ce telephone.";
  enableButton.hidden = true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/fcm/server/login", { method: "POST", body: JSON.stringify({ code: document.getElementById("code").value }) });
    loginForm.hidden = true;
    enableButton.hidden = false;
    status.textContent = "Connecte. Active maintenant les notifications.";
  } catch (error) { status.textContent = error.message; }
});

enableButton.addEventListener("click", () => enablePush().catch((error) => { status.textContent = error.message; }));

request("/api/fcm/server/session").then(({ authenticated }) => {
  loginForm.hidden = authenticated;
  enableButton.hidden = !authenticated;
  status.textContent = authenticated ? "Active les notifications sur ce telephone." : "Entre le code serveur.";
}).catch(() => { loginForm.hidden = false; status.textContent = "Entre le code serveur."; });
