import { z } from "zod";

// Automation naming/config — keeps garbage out of the database and
// gives instant feedback instead of a failed insert.
export const automationNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(80, "Keep it under 80 characters");

export const keywordSchema = z
  .string()
  .trim()
  .min(1, "Keyword can't be empty")
  .max(200, "Keep keywords under 200 characters");

export const dailyLimitSchema = z.number().int().min(1).max(10000);
export const hourlyLimitSchema = z.number().int().min(1).max(2000);

// Blocks the obvious foot-guns before a reply link ever reaches a real
// customer: javascript: URLs, localhost/private IPs, and non-http(s) schemes.
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
];

export function validateOutgoingUrl(raw: string): { ok: true } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid URL." };
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, reason: "Only http:// and https:// links can be sent." };
  }
  if (PRIVATE_HOST_PATTERNS.some((p) => p.test(url.hostname))) {
    return { ok: false, reason: "Links to local/private addresses aren't allowed in replies." };
  }
  return { ok: true };
}

export const apiKeyNameSchema = z
  .string()
  .trim()
  .min(1, "Give this key a name")
  .max(60, "Keep it under 60 characters");

export const replyTextSchema = z
  .string()
  .trim()
  .min(1, "Message can't be empty")
  .max(2000, "Keep replies under 2000 characters (WhatsApp/Messenger limits apply)");
