"use strict";
/* -----------------------------------------------------------------
   Petit logger centralisé — préfixe chaque log avec un contexte
   (fichier/module) et l'heure, pour retrouver l'origine d'une erreur
   en un coup d'œil dans les logs du serveur.
   ----------------------------------------------------------------- */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function timestamp() {
    return new Date().toISOString();
}
exports.logger = {
    info: (context, message, data) => {
        console.log(`[${timestamp()}] [INFO] [${context}] ${message}`, data ?? "");
    },
    warn: (context, message, data) => {
        console.warn(`[${timestamp()}] [WARN] [${context}] ${message}`, data ?? "");
    },
    error: (context, message, err) => {
        console.error(`[${timestamp()}] [ERROR] [${context}] ${message}`);
        if (err instanceof Error) {
            console.error(`  → ${err.message}`);
            console.error(`  → Stack: ${err.stack}`);
        }
        else if (err) {
            console.error("  → Détail:", err);
        }
    },
};
//# sourceMappingURL=logger.js.map