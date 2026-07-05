import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptToken } from "./_shared/crypto.ts";

const GRAPH_VERSION = Deno.env.get("META_GRAPH_API_VERSION") ?? "v20.0";

const REQUIRED_PERMISSIONS: Record<string, string[]> = {
  facebook: ["pages_show_list", "pages_messaging", "pages_manage_metadata", "pages_read_engagement"],
  instagram: ["instagram_basic", "instagram_manage_messages", "instagram_manage_comments"],
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const { social_account_id } = await req.json();
    if (!social_account_id) {
      return new Response(JSON.stringify({ error: "social_account_id is required" }), { status: 400 });
    }

    // Service-role read, but scoped by user_id to make sure this user
    // actually owns the account before we ever touch its token.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: account } = await admin
      .from("social_accounts")
      .select("id, user_id, platform, access_token_encrypted")
      .eq("id", social_account_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!account) {
      return new Response(JSON.stringify({ error: "Account not found or not yours" }), { status: 404 });
    }

    if (account.platform === "whatsapp") {
      return new Response(JSON.stringify({
        platform: "whatsapp",
        note: "WhatsApp uses a system-user token rather than per-permission OAuth scopes; check token validity under Settings instead.",
      }));
    }

    const token = await decryptToken(new Uint8Array(account.access_token_encrypted));
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/permissions?access_token=${token}`);
    const body = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Meta rejected the permissions check", detail: body }), { status: 400 });
    }

    const granted = new Set(
      (body.data ?? []).filter((p: any) => p.status === "granted").map((p: any) => p.permission)
    );
    const required = REQUIRED_PERMISSIONS[account.platform] ?? [];
    const missing = required.filter((p) => !granted.has(p));

    return new Response(JSON.stringify({
      platform: account.platform,
      granted: Array.from(granted),
      required,
      missing,
      healthy: missing.length === 0,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("check-permissions error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
