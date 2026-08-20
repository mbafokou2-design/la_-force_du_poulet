/* -----------------------------------------------------------------
   Petit logger centralisé — préfixe chaque log avec un contexte
   (fichier/module) et l'heure, pour retrouver l'origine d'une erreur
   en un coup d'œil dans les logs du serveur.
   ----------------------------------------------------------------- */

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info: (context: string, message: string, data?: unknown) => {
    console.log(`[${timestamp()}] [INFO] [${context}] ${message}`, data ?? "");
  },
  warn: (context: string, message: string, data?: unknown) => {
    console.warn(`[${timestamp()}] [WARN] [${context}] ${message}`, data ?? "");
  },
  error: (context: string, message: string, err?: unknown) => {
    console.error(`[${timestamp()}] [ERROR] [${context}] ${message}`);
    if (err instanceof Error) {
      console.error(`  → ${err.message}`);
      console.error(`  → Stack: ${err.stack}`);
    } else if (err) {
      console.error("  → Détail:", err);
    }
  },
};