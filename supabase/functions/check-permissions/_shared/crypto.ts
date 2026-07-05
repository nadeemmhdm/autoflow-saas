async function getKey(): Promise<CryptoKey> {
  const b64 = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!b64) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function decryptToken(combined: Uint8Array): Promise<string> {
  const key = await getKey();
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}
