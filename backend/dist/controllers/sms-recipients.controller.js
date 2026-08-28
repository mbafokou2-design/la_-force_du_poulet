"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmsRecipientsController = getSmsRecipientsController;
exports.addSmsRecipientController = addSmsRecipientController;
exports.removeSmsRecipientController = removeSmsRecipientController;
const sms_recipients_repository_1 = require("../repositories/sms-recipients.repository");
const logger_1 = require("../utils/logger");
const CONTEXT = "sms-recipients.controller.ts";
function toRecipientPayload(recipients) {
    return {
        recipients,
        total: recipients.length,
        default_recipients: (0, sms_recipients_repository_1.getDefaultSmsRecipients)(),
    };
}
function extractPhone(value) {
    return String(value ?? "").trim();
}
async function getSmsRecipientsController(req, res) {
    try {
        const recipients = await (0, sms_recipients_repository_1.getSmsRecipients)();
        return res.json(toRecipientPayload(recipients));
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, "getSmsRecipients failed", err);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des numéros SMS.", detail: err.message });
    }
}
async function addSmsRecipientController(req, res) {
    const phone = extractPhone(req.body?.phone);
    if (!phone) {
        return res.status(400).json({ error: "Le numéro est requis." });
    }
    try {
        const recipients = await (0, sms_recipients_repository_1.addSmsRecipient)(phone);
        return res.status(201).json(toRecipientPayload(recipients));
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, "addSmsRecipient failed", err);
        return res.status(500).json({ error: "Erreur serveur lors de l'ajout du numéro SMS.", detail: err.message });
    }
}
async function removeSmsRecipientController(req, res) {
    const phone = extractPhone(req.params.phone);
    if (!phone) {
        return res.status(400).json({ error: "Le numéro est requis." });
    }
    try {
        const recipients = await (0, sms_recipients_repository_1.removeSmsRecipient)(phone);
        return res.json(toRecipientPayload(recipients));
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, "removeSmsRecipient failed", err);
        return res.status(500).json({ error: "Erreur serveur lors de la suppression du numéro SMS.", detail: err.message });
    }
}
//# sourceMappingURL=sms-recipients.controller.js.map