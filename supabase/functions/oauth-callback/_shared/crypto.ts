// AES-256-GCM encryption for access tokens at rest.
// TOKEN_ENCRYPTION_KEY must be a 32-byte key, base64-encoded, set as an
// Edge Function secret (never in the frontend, never in the database).

async function getKey(): Promise<CryptoKey> {
  const b64 = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!b64) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plaintext: string): Promise<Uint8Array> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
  // Store as iv || ciphertext so decryption is self-contained.
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return combined;
}

export async function decryptToken(combined: Uint8Array): Promise<string> {
  const key = await getKey();
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

// Verifies Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw body
// using the app secret). This is what proves a webhook call actually came
// from Meta and not from an attacker who guessed the URL.
export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expectedHex = signatureHeader.slice(7);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const macHex = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");

  // Constant-time comparison to avoid timing attacks.
  if (macHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < macHex.length; i++) diff |= macHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  return diff === 0;
}
