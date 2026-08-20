import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

const CONTEXT = "tranzak.service.ts";

const TRANZAK_APP_ID = process.env.TRANZAK_APP_ID;
const TRANZAK_APP_KEY = process.env.TRANZAK_APP_KEY;
const TRANZAK_MODE = process.env.TRANZAK_MODE || "sandbox";
const STAFF_PHONE_NUMBERS = (process.env.STAFF_PHONE_NUMBERS || "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

// Vérification au chargement du module — on préfère planter tôt avec un message clair
if (!TRANZAK_APP_ID || !TRANZAK_APP_KEY) {
  logger.warn(CONTEXT, "TRANZAK_APP_ID ou TRANZAK_APP_KEY manquant dans .env — l'envoi SMS échouera.");
}

if (STAFF_PHONE_NUMBERS.length === 0) {
  logger.warn(CONTEXT, "STAFF_PHONE_NUMBERS est vide dans .env — aucun SMS ne sera envoyé.");
}

interface SmsResult {
  success: boolean;
  errorMessage?: string;
}

/**
 * Envoie le récapitulatif de commande par SMS à tous les numéros du staff.
 * Ne bloque jamais la commande : si le SMS échoue, on log l'erreur en détail
 * et on renvoie success:false — la commande reste enregistrée en base.
 */
export async function sendOrderSms(tableNumber: string, message: string): Promise<SmsResult> {
  if (!TRANZAK_APP_ID || !TRANZAK_APP_KEY) {
    const errorMessage = "Configuration Tranzak absente (APP_ID/APP_KEY manquants).";
    logger.error(CONTEXT, errorMessage);
    return { success: false, errorMessage };
  }

  if (STAFF_PHONE_NUMBERS.length === 0) {
    const errorMessage = "Aucun numéro de serveuse configuré (STAFF_PHONE_NUMBERS).";
    logger.error(CONTEXT, errorMessage);
    return { success: false, errorMessage };
  }

  try {
    // Base URL selon la doc officielle Tranzak
    // SANDBOX: https://sandbox.dsapi.tranzak.me
    // PRODUCTION: https://dsapi.tranzak.me
    const baseUrl = TRANZAK_MODE === "production"
      ? "https://dsapi.tranzak.me"
      : "https://sandbox.dsapi.tranzak.me";

    logger.info(CONTEXT, `Authentification Tranzak via ${baseUrl}/auth/token (mode: ${TRANZAK_MODE})`);

    const authResponse = await fetch(`${baseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: TRANZAK_APP_ID, appKey: TRANZAK_APP_KEY }),
    });

    if (!authResponse.ok) {
      const errorBody = await authResponse.text();
      throw new Error(`Échec authentification Tranzak (HTTP ${authResponse.status}): ${errorBody}`);
    }

    const authData = await authResponse.json() as any;
    const token = authData.data?.token ?? authData.token ?? authData.access_token;

    if (!token) {
      throw new Error(`Réponse d'authentification Tranzak sans token exploitable. Reçu: ${JSON.stringify(authData)}`);
    }

    logger.info(CONTEXT, `Envoi SMS pour la table ${tableNumber} vers ${STAFF_PHONE_NUMBERS.length} numéro(s)...`);

    const smsResponse = await fetch(`${baseUrl}/notifications/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipients: STAFF_PHONE_NUMBERS,
        message,
      }),
    });

    if (!smsResponse.ok) {
      const errorBody = await smsResponse.text();
      throw new Error(`Échec envoi SMS Tranzak (HTTP ${smsResponse.status}): ${errorBody}`);
    }

    logger.info(CONTEXT, `SMS envoyé avec succès pour la table ${tableNumber}.`);
    return { success: true };
  } catch (err: any) {
    logger.error(CONTEXT, `Échec de l'envoi SMS pour la table ${tableNumber}`, err);
    return { success: false, errorMessage: err.message || "Erreur inconnue lors de l'envoi SMS." };
  }
}