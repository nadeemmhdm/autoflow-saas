import { createClient } from "npm:@supabase/supabase-js@2";

// Lets a user simulate a comment/DM against one of their own automations
// without touching the real Meta/WhatsApp API, without counting against
// daily/hourly limits, and without creating a conversation record.
// verify_jwt=true: only the automation's owner can test it (enforced by
// RLS on the read, since we use the user's own JWT, not the service role).

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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const { automation_id, sample_text } = await req.json();
    if (!automation_id || typeof sample_text !== "string") {
      return new Response(JSON.stringify({ error: "automation_id and sample_text are required" }), { status: 400 });
    }

    // RLS on `automations` (owner-only) protects this read — a user can
    // only simulate their own flows, never someone else's.
    const { data: automation, error: fetchErr } = await supabase
      .from("automations")
      .select("id, flow_definition")
      .eq("id", automation_id)
      .single();

    if (fetchErr || !automation) {
      return new Response(JSON.stringify({ error: "Automation not found or not yours" }), { status: 404 });
    }

    const flow = automation.flow_definition as { nodes: any[]; edges: any[] };
    const triggerNode = flow.nodes.find((n) => n.type === "trigger");
    if (!triggerNode) {
      return new Response(JSON.stringify({ matched: false, reason: "no_trigger_node" }));
    }

    const outgoing = flow.edges.filter((e) => e.source === triggerNode.id);
    const results = [];

    for (const edge of outgoing) {
      const nextNode = flow.nodes.find((n) => n.id === edge.target);
      if (!nextNode) continue;

      if (nextNode.type === "condition") {
        const isMatch = matchesCondition(sample_text, nextNode.data.matchType, nextNode.data.value);
        if (!isMatch) {
          results.push({ condition: nextNode.data, matched: false });
          continue;
        }
        const yesEdges = flow.edges.filter((e) => e.source === nextNode.id && (e.sourceHandle === "yes" || !e.sourceHandle));
        const actionNodes = yesEdges
          .map((e) => flow.nodes.find((n) => n.id === e.target))
          .filter((n): n is any => !!n && n.type === "action");
        if (actionNodes.length === 0) {
          results.push({ condition: nextNode.data, matched: true, action: null });
        }
        for (const actionNode of actionNodes) {
          results.push({ condition: nextNode.data, matched: true, action: actionNode.data });
        }
      } else if (nextNode.type === "action") {
        results.push({ condition: null, matched: true, action: nextNode.data });
      }
    }

    const anyMatched = results.some((r) => r.matched);
    return new Response(JSON.stringify({ matched: anyMatched, paths: results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("test-automation error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
