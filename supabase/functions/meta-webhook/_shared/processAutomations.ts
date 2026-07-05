import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { decryptToken } from "./crypto.ts";

const GRAPH_VERSION = Deno.env.get("META_GRAPH_API_VERSION") ?? "v20.0";
const COOLDOWN_SECONDS = 20; // minimum gap between two automated replies to the same contact

export interface IncomingEvent {
  platform: "instagram" | "facebook" | "whatsapp";
  externalAccountId: string;
  senderId: string;
  text: string;
  eventKind: "comment" | "dm";
  senderName?: string;
}

function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function matchesCondition(text: string, matchType: string, value: string): boolean {
  const t = text.toLowerCase();
  const v = value.toLowerCase();
  if (matchType === "contains") return t.includes(v);
  if (matchType === "exact") return t === v;
  if (matchType === "starts_with") return t.startsWith(v);
  if (matchType === "regex") {
    try {
      return new RegExp(value, "i").test(text);
    } catch {
      return false;
    }
  }
  return false;
}

async function sendInstagramOrFacebookDM(pageAccessToken: string, recipientId: string, message: string) {
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

async function upsertConversation(db: SupabaseClient, account: any, event: IncomingEvent) {
  const { data: existing } = await db
    .from("conversations")
    .select("*")
    .eq("social_account_id", account.id)
    .eq("contact_external_id", event.senderId)
    .maybeSingle();

  if (existing) {
    await db.from("conversations").update({ last_event_at: new Date().toISOString() }).eq("id", existing.id);
    return existing;
  }

  const { data: created } = await db
    .from("conversations")
    .insert({
      user_id: account.user_id,
      social_account_id: account.id,
      platform: event.platform,
      contact_external_id: event.senderId,
      contact_name: event.senderName ?? null,
      last_event_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  return created;
}

export async function runAutomationsForEvent(event: IncomingEvent, opts: { dryRun?: boolean } = {}) {
  const db = admin();
  const dryRun = opts.dryRun ?? false;

  const { data: account } = await db
    .from("social_accounts")
    .select("id, user_id, access_token_encrypted, platform")
    .eq("platform", event.platform)
    .eq("external_account_id", event.externalAccountId)
    .eq("status", "active")
    .maybeSingle();

  if (!account) return { matched: 0, reason: "no_connected_account" };

  const conversation = dryRun ? null : await upsertConversation(db, account, event);

  if (conversation?.automation_paused) {
    return { matched: 0, reason: "conversation_paused_for_human" };
  }

  if (conversation?.last_automation_sent_at) {
    const secondsSince = (Date.now() - new Date(conversation.last_automation_sent_at).getTime()) / 1000;
    if (secondsSince < COOLDOWN_SECONDS) {
      return { matched: 0, reason: "cooldown_active" };
    }
  }

  const triggerType = event.eventKind === "comment" ? "comment_keyword" : "dm_keyword";

  const { data: automations } = await db
    .from("automations")
    .select("id, user_id, flow_definition, daily_limit, hourly_limit")
    .eq("social_account_id", account.id)
    .eq("status", "active")
    .eq("trigger_type", triggerType);

  if (!automations?.length) return { matched: 0, reason: "no_active_automations" };

  let executed = 0;
  const dryRunResults: any[] = [];

  for (const automation of automations) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfHour = new Date();
    startOfHour.setMinutes(0, 0, 0);

    if (!dryRun) {
      const [{ count: dayCount }, { count: hourCount }] = await Promise.all([
        db.from("automation_logs").select("*", { count: "exact", head: true })
          .eq("automation_id", automation.id).eq("status", "success").gte("created_at", startOfDay.toISOString()),
        db.from("automation_logs").select("*", { count: "exact", head: true })
          .eq("automation_id", automation.id).eq("status", "success").gte("created_at", startOfHour.toISOString()),
      ]);

      if ((dayCount ?? 0) >= automation.daily_limit || (hourCount ?? 0) >= automation.hourly_limit) {
        await db.from("automation_logs").insert({
          automation_id: automation.id,
          user_id: automation.user_id,
          conversation_id: conversation?.id ?? null,
          trigger_payload: event,
          status: "rate_limited",
        });
        continue;
      }
    }

    const flow = automation.flow_definition as { nodes: any[]; edges: any[] };
    const triggerNode = flow.nodes.find((n) => n.type === "trigger");
    if (!triggerNode) continue;

    const outgoing = flow.edges.filter((e) => e.source === triggerNode.id);
    let matched = false;

    for (const edge of outgoing) {
      const nextNode = flow.nodes.find((n) => n.id === edge.target);
      if (!nextNode) continue;

      let actionNodes: any[] = [];
      if (nextNode.type === "condition") {
        if (!matchesCondition(event.text, nextNode.data.matchType, nextNode.data.value)) continue;
        // A single matched condition can fan out to more than one action
        // (e.g. "acknowledge" + "hand off to human").
        const yesEdges = flow.edges.filter((e) => e.source === nextNode.id && (e.sourceHandle === "yes" || !e.sourceHandle));
        actionNodes = yesEdges
          .map((e) => flow.nodes.find((n) => n.id === e.target))
          .filter((n): n is any => !!n && n.type === "action");
      } else if (nextNode.type === "action") {
        actionNodes = [nextNode];
      }

      for (const actionNode of actionNodes) {
        matched = true;

        if (dryRun) {
          dryRunResults.push({ automation_id: automation.id, matched_condition: nextNode.type === "condition" ? nextNode.data : null, action: actionNode.data });
          continue;
        }

        await executeAction(db, account, automation, conversation, event, actionNode);
      }
    }

    if (matched) executed++;
  }

  return dryRun ? { matched: dryRunResults.length, preview: dryRunResults } : { matched: executed };
}

async function executeAction(db: SupabaseClient, account: any, automation: any, conversation: any, event: IncomingEvent, actionNode: any) {
  if (actionNode.data.actionType === "human_handoff") {
    await db.from("conversations").update({ automation_paused: true }).eq("id", conversation.id);
    await db.from("automation_logs").insert({
      automation_id: automation.id,
      user_id: automation.user_id,
      conversation_id: conversation.id,
      trigger_payload: event,
      action_taken: "human_handoff",
      status: "success",
    });
    return;
  }

  try {
    const rawToken = await decryptToken(new Uint8Array(account.access_token_encrypted));
    const message = actionNode.data.content ?? "Thanks for reaching out!";

    let result;
    if (event.platform === "whatsapp") {
      const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
      result = await sendWhatsAppMessage(phoneNumberId, rawToken, event.senderId, message);
    } else {
      result = await sendInstagramOrFacebookDM(rawToken, event.senderId, message);
    }

    await db.from("automation_logs").insert({
      automation_id: automation.id,
      user_id: automation.user_id,
      conversation_id: conversation.id,
      trigger_payload: event,
      action_taken: actionNode.data.actionType,
      status: result.ok ? "success" : "failed",
      error_message: result.ok ? null : JSON.stringify(result.body),
    });

    if (result.ok) {
      await db.from("conversations").update({ last_automation_sent_at: new Date().toISOString() }).eq("id", conversation.id);
    }
  } catch (err) {
    await db.from("automation_logs").insert({
      automation_id: automation.id,
      user_id: automation.user_id,
      conversation_id: conversation?.id ?? null,
      trigger_payload: event,
      status: "failed",
      error_message: String(err),
    });
  }
}
