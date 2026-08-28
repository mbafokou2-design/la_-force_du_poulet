import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getMessaging, getToken, onMessage, deleteToken } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";

const $ = (id) => document.getElementById(id);
const TOKEN_KEY = "lfp_server_fcm_token";
let messaging;
let lastToken = localStorage.getItem(TOKEN_KEY) || null;
let workerRegistration;
let vapidKey;

const REQUEST_TIMEOUT_MS = 12000;
const request = async (path, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(path, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Le serveur met trop de temps a repondre. Reessaie.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const loading = (show) => {
  $("loading").hidden = !show;
  document.querySelectorAll("#loginForm button, #enableButton, #unsubscribeButton").forEach((button) => { button.disabled = show; });
};
const showActivation = (message) => {
  $("successPanel").hidden = true;
  $("activationPanel").hidden = false;
  $("status").textContent = message;
};
const showReady = () => {
  $("activationPanel").hidden = true;
  $("successPanel").hidden = false;
  $("status").textContent = "Ce telephone est inscrit aux alertes.";
};

function timeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise).then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

async function prepareMessaging() {
  if (messaging && workerRegistration && vapidKey) return { messaging, workerRegistration, vapidKey };
  if (!("serviceWorker" in navigator) || !("Notification" in window)) throw new Error("Ce navigateur ne prend pas en charge les notifications.");
  const config = await timeout(request("/api/fcm/public-config"), 10000, "La configuration Firebase ne repond pas. Reessaie dans un instant.");
  vapidKey = config.vapidKey;
  workerRegistration = await timeout(navigator.serviceWorker.register("/firebase-messaging-sw.js"), 10000, "Le service de notifications ne demarre pas.");
  await timeout(navigator.serviceWorker.ready, 10000, "Le service de notifications met trop de temps a demarrer.");
  messaging = getMessaging(initializeApp(config.firebaseConfig));
  onMessage(messaging, (payload) => { $("status").textContent = payload.notification?.body || "Nouvelle commande recue."; });
  return { messaging, workerRegistration, vapidKey };
}

async function obtainToken() {
  const setup = await prepareMessaging();
  const token = await timeout(getToken(setup.messaging, { vapidKey: setup.vapidKey, serviceWorkerRegistration: setup.workerRegistration }), 15000, "Firebase ne repond pas sur ce telephone. Verifie Chrome et l'autorisation des notifications.");
  if (!token) throw new Error("Token FCM non genere.");
  lastToken = token;
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

async function restoreSubscription() {
  if (Notification.permission !== "granted") {
    showActivation("Active les notifications sur ce telephone.");
    return;
  }
  $("status").textContent = "Verification des notifications de ce telephone...";
  try {
    const token = await obtainToken();
    await request("/api/fcm/tokens", { method: "POST", body: JSON.stringify({ token, device_label: navigator.userAgent.slice(0, 120) }) });
    showReady();
  } catch (error) {
    showActivation(error.message);
  }
}

async function subscribe() {
  loading(true);
  try {
    const permission = await timeout(Notification.requestPermission(), 20000, "La demande d'autorisation a expire. Reessaie puis accepte les notifications.");
    if (permission !== "granted") throw new Error("Autorisation des notifications refusee.");
    const token = await obtainToken();
    await request("/api/fcm/tokens", { method: "POST", body: JSON.stringify({ token, device_label: navigator.userAgent.slice(0, 120) }) });
    showReady();
  } catch (error) {
    showActivation(error.message);
  } finally {
    loading(false);
  }
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  loading(true);
  try {
    await request("/api/fcm/server/login", { method: "POST", body: JSON.stringify({ code: $("code").value }) });
    $("loginForm").hidden = true;
    await restoreSubscription();
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    loading(false);
  }
});

$("enableButton").addEventListener("click", subscribe);
$("unsubscribeButton").addEventListener("click", async () => {
  loading(true);
  try {
    const token = lastToken || localStorage.getItem(TOKEN_KEY);
    if (token) await request("/api/fcm/tokens", { method: "DELETE", body: JSON.stringify({ token }) });
    if (messaging) await timeout(deleteToken(messaging), 12000, "La desactivation des notifications met trop de temps.");
    lastToken = null;
    localStorage.removeItem(TOKEN_KEY);
    showActivation("Notifications desactivees sur ce telephone.");
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    loading(false);
  }
});

request("/api/fcm/server/session").then(async ({ authenticated }) => {
  if (authenticated) {
    await restoreSubscription();
  } else {
    $("loginForm").hidden = false;
    $("status").textContent = "Entre le code serveur.";
  }
}).catch(() => {
  $("loginForm").hidden = false;
  $("status").textContent = "Impossible de verifier la session.";
});