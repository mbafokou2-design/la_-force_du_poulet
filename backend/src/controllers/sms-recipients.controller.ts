import { Request, Response } from "express";
import {
  addSmsRecipient,
  getDefaultSmsRecipients,
  getSmsRecipients,
  removeSmsRecipient,
} from "../repositories/sms-recipients.repository";
import { logger } from "../utils/logger";

const CONTEXT = "sms-recipients.controller.ts";

function toRecipientPayload(recipients: string[]) {
  return {
    recipients,
    total: recipients.length,
    default_recipients: getDefaultSmsRecipients(),
  };
}

function extractPhone(value: unknown): string {
  return String(value ?? "").trim();
}

export async function getSmsRecipientsController(req: Request, res: Response) {
  try {
    const recipients = await getSmsRecipients();
    return res.json(toRecipientPayload(recipients));
  } catch (err: any) {
    logger.error(CONTEXT, "getSmsRecipients failed", err);
    return res.status(500).json({ error: "Erreur serveur lors de la récupération des numéros SMS.", detail: err.message });
  }
}

export async function addSmsRecipientController(req: Request, res: Response) {
  const phone = extractPhone(req.body?.phone);
  if (!phone) {
    return res.status(400).json({ error: "Le numéro est requis." });
  }

  try {
    const recipients = await addSmsRecipient(phone);
    return res.status(201).json(toRecipientPayload(recipients));
  } catch (err: any) {
    logger.error(CONTEXT, "addSmsRecipient failed", err);
    return res.status(500).json({ error: "Erreur serveur lors de l'ajout du numéro SMS.", detail: err.message });
  }
}

export async function removeSmsRecipientController(req: Request, res: Response) {
  const phone = extractPhone(req.params.phone);
  if (!phone) {
    return res.status(400).json({ error: "Le numéro est requis." });
  }

  try {
    const recipients = await removeSmsRecipient(phone);
    return res.json(toRecipientPayload(recipients));
  } catch (err: any) {
    logger.error(CONTEXT, "removeSmsRecipient failed", err);
    return res.status(500).json({ error: "Erreur serveur lors de la suppression du numéro SMS.", detail: err.message });
  }
}
