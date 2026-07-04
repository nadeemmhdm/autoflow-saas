import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyMetaSignature } from "./_shared/crypto.ts";
import { runAutomationsForEvent } from "./_shared/processAutomations.ts";

// Same trust model as meta-webhook: GET handshake + HMAC signature on POST.
// verify_jwt=false because WhatsApp calls this directly.

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

    if (mode === "subscribe" && token === expected) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Hub-Signature-256");
  const appSecret = Deno.env.get("META_APP_SECRET")!; // WhatsApp Cloud API signs with the same Meta App Secret

  const valid = await verifyMetaSignature(rawBody, signature, appSecret);
  if (!valid) {
    console.warn("Rejected WhatsApp webhook with invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  await db.from("webhook_events").insert({
    platform: "whatsapp",
    event_type: "message",
    payload,
  });

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        for (const message of value?.messages ?? []) {
          if (message.type === "text") {
            await runAutomationsForEvent({
              platform: "whatsapp",
              externalAccountId: phoneNumberId,
              senderId: message.from,
              text: message.text.body,
              eventKind: "dm",
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("whatsapp-webhook processing error:", err);
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
});
