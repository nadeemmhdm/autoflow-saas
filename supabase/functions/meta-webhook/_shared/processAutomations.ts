import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { decryptToken } from "./crypto.ts";

const GRAPH_VERSION = Deno.env.get("META_GRAPH_API_VERSION") ?? "v20.0";

export interface IncomingEvent {
  platform: "instagram" | "facebook" | "whatsapp";
  externalAccountId: string; // the Page ID / IG business ID / phone number ID that received the event
  senderId: string; // the person who commented/messaged, used as the recipient of the reply
  text: string;
  eventKind: "comment" | "dm";
}

function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function matchesCondition(text: string, matchType: string, value: string): boolean {
  const t = text.toLowerCase();
  const v = value.toLowerCase();
  if (matchType === "contains") return t.includes(v);
  if (matchType === "exact") return t === v;
  if (matchType === "regex") {
    try {
      return new RegExp(value, "i").test(text);
    } catch {
      return false;
    }
  }
  return false;
}

async function sendInstagramOrFacebookDM(pageAccessToken: string, platform: string, recipientId: string, message: string) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/me/messages?access_token=${pageAccessToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
      messaging_type: "RESPONSE",
    }),
  });
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}

async function sendWhatsAppMessage(phoneNumberId: string, accessToken: string, toWaId: string, message: string) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toWaId,
      type: "text",
      text: { body: message },
    }),
  });
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}

export async function runAutomationsForEvent(event: IncomingEvent) {
  const db = admin();

  // 1. Find the connected account this event belongs to.
  const { data: account } = await db
    .from("social_accounts")
    .select("id, user_id, access_token_encrypted, platform")
    .eq("platform", event.platform)
    .eq("external_account_id", event.externalAccountId)
    .eq("status", "active")
    .maybeSingle();

  if (!account) return { matched: 0, reason: "no_connected_account" };

  const triggerType = event.eventKind === "comment" ? "comment_keyword" : "dm_keyword";

  // 2. Find active automations for this account + trigger type.
  const { data: automations } = await db
    .from("automations")
    .select("id, user_id, flow_definition, daily_limit")
    .eq("social_account_id", account.id)
    .eq("status", "active")
    .eq("trigger_type", triggerType);

  if (!automations?.length) return { matched: 0, reason: "no_active_automations" };

  let executed = 0;

  for (const automation of automations) {
    // Daily send limit guard — protects the connected account from
    // Meta rate limits / spam flags.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await db
      .from("automation_logs")
      .select("*", { count: "exact", head: true })
      .eq("automation_id", automation.id)
      .eq("status", "success")
      .gte("created_at", startOfDay.toISOString());

    if ((count ?? 0) >= automation.daily_limit) {
      await db.from("automation_logs").insert({
        automation_id: automation.id,
        user_id: automation.user_id,
        trigger_payload: event,
        status: "rate_limited",
      });
      continue;
    }

    const flow = automation.flow_definition as { nodes: any[]; edges: any[] };
    const triggerNode = flow.nodes.find((n) => n.type === "trigger");
    if (!triggerNode) continue;

    // Walk from the trigger to the first matching condition, then to its action.
    const outgoing = flow.edges.filter((e) => e.source === triggerNode.id);

    let matched = false;
    for (const edge of outgoing) {
      const nextNode = flow.nodes.find((n) => n.id === edge.target);
      if (!nextNode) continue;

      if (nextNode.type === "condition") {
        if (!matchesCondition(event.text, nextNode.data.matchType, nextNode.data.value)) continue;
        const yesEdge = flow.edges.find((e) => e.source === nextNode.id && (e.sourceHandle === "yes" || !e.sourceHandle));
        const actionNode = flow.nodes.find((n) => n.id === yesEdge?.target);
        if (actionNode?.type === "action") {
          matched = true;
          await executeAction(db, account, automation, event, actionNode);
        }
      } else if (nextNode.type === "action") {
        matched = true;
        await executeAction(db, account, automation, event, nextNode);
      }
    }

    if (matched) executed++;
  }

  return { matched: executed };
}

async function executeAction(db: SupabaseClient, account: any, automation: any, event: IncomingEvent, actionNode: any) {
  try {
    const rawToken = await decryptToken(new Uint8Array(account.access_token_encrypted));
    const message = actionNode.data.content ?? "Thanks for reaching out!";

    let result;
    if (event.platform === "whatsapp") {
      const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
      result = await sendWhatsAppMessage(phoneNumberId, rawToken, event.senderId, message);
    } else {
      result = await sendInstagramOrFacebookDM(rawToken, event.platform, event.senderId, message);
    }

    await db.from("automation_logs").insert({
      automation_id: automation.id,
      user_id: automation.user_id,
      trigger_payload: event,
      action_taken: actionNode.data.actionType,
      status: result.ok ? "success" : "failed",
      error_message: result.ok ? null : JSON.stringify(result.body),
    });
  } catch (err) {
    await db.from("automation_logs").insert({
      automation_id: automation.id,
      user_id: automation.user_id,
      trigger_payload: event,
      status: "failed",
      error_message: String(err),
    });
  }
}
