import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyMetaSignature } from "./_shared/crypto.ts";
import { runAutomationsForEvent } from "./_shared/processAutomations.ts";

// This function has verify_jwt=false — Meta cannot send a Supabase JWT.
// Trust instead comes from:
//   1. The GET verification handshake (hub.verify_token check), and
//   2. The X-Hub-Signature-256 HMAC check on every POST body.
// Do not remove either check.

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

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
  const appSecret = Deno.env.get("META_APP_SECRET")!;

  const valid = await verifyMetaSignature(rawBody, signature, appSecret);
  if (!valid) {
    console.warn("Rejected webhook with invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Log raw event for debugging/audit before processing.
  await db.from("webhook_events").insert({
    platform: payload.object === "instagram" ? "instagram" : "facebook",
    event_type: payload.object,
    payload,
  });

  // Meta batches events; handle each entry/change independently and
  // always return 200 quickly so Meta doesn't retry/backoff on us.
  try {
    for (const entry of payload.entry ?? []) {
      // Comment events (Instagram + Facebook Page comments)
      for (const change of entry.changes ?? []) {
        if (change.field === "comments") {
          const value = change.value;
          await runAutomationsForEvent({
            platform: payload.object === "instagram" ? "instagram" : "facebook",
            externalAccountId: entry.id,
            senderId: value.from?.id,
            text: value.text ?? "",
            eventKind: "comment",
          });
        }
      }

      // DM / Messenger events
      for (const messaging of entry.messaging ?? []) {
        if (messaging.message?.text) {
          await runAutomationsForEvent({
            platform: payload.object === "instagram" ? "instagram" : "facebook",
            externalAccountId: entry.id,
            senderId: messaging.sender?.id,
            text: messaging.message.text,
            eventKind: "dm",
          });
        }
      }
    }
  } catch (err) {
    console.error("meta-webhook processing error:", err);
    // Still return 200 — we don't want Meta to disable the webhook over
    // an internal processing bug. The raw event is already logged above
    // for manual reprocessing.
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
});
