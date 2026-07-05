import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyMetaSignature } from "./_shared/crypto.ts";
import { runAutomationsForEvent } from "./_shared/processAutomations.ts";

// verify_jwt=false — Meta cannot send a Supabase JWT. Trust comes from:
//   1. The GET verification handshake (hub.verify_token check)
//   2. The X-Hub-Signature-256 HMAC check on every POST body
//   3. A timestamp freshness check + event_id dedupe (replay protection)
// Do not remove any of these.

const MAX_EVENT_AGE_SECONDS = 5 * 60;

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
  const platform = payload.object === "instagram" ? "instagram" : "facebook";

  try {
    for (const entry of payload.entry ?? []) {
      // Replay guard: reject entries whose own timestamp is stale. Meta
      // sends epoch seconds in entry.time.
      if (entry.time) {
        const ageSeconds = Date.now() / 1000 - entry.time;
        if (ageSeconds > MAX_EVENT_AGE_SECONDS) {
          console.warn(`Dropping stale event, age=${ageSeconds}s`);
          continue;
        }
      }

      for (const change of entry.changes ?? []) {
        if (change.field !== "comments") continue;
        const value = change.value;
        const eventId = value.comment_id ?? null;

        if (eventId && (await alreadyProcessed(db, platform, eventId))) continue;
        await logEvent(db, platform, "comments", payload, eventId);

        await runAutomationsForEvent({
          platform,
          externalAccountId: entry.id,
          senderId: value.from?.id,
          senderName: value.from?.username ?? value.from?.name,
          text: value.text ?? "",
          eventKind: "comment",
        });
      }

      for (const messaging of entry.messaging ?? []) {
        if (!messaging.message?.text) continue;
        const eventId = messaging.message.mid ?? null;

        if (eventId && (await alreadyProcessed(db, platform, eventId))) continue;
        await logEvent(db, platform, "messages", payload, eventId);

        await runAutomationsForEvent({
          platform,
          externalAccountId: entry.id,
          senderId: messaging.sender?.id,
          text: messaging.message.text,
          eventKind: "dm",
        });
      }
    }
  } catch (err) {
    console.error("meta-webhook processing error:", err);
    // Still return 200 — a processing bug shouldn't get the webhook
    // disabled by Meta. The raw event is already logged for reprocessing.
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
});

async function alreadyProcessed(db: any, platform: string, eventId: string): Promise<boolean> {
  const { data } = await db
    .from("webhook_events")
    .select("id")
    .eq("platform", platform)
    .eq("event_id", eventId)
    .maybeSingle();
  return !!data;
}

async function logEvent(db: any, platform: string, eventType: string, payload: unknown, eventId: string | null) {
  // Unique index on (platform, event_id) makes this a safe dedupe marker
  // even under concurrent duplicate deliveries.
  await db.from("webhook_events").insert({ platform, event_type: eventType, payload, event_id: eventId });
}
