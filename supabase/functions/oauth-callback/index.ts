import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptToken } from "./_shared/crypto.ts";

const GRAPH_VERSION = Deno.env.get("META_GRAPH_API_VERSION") ?? "v20.0";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    // verify_jwt=true on this function already ensures the caller has a
    // valid Supabase session. We re-derive the user from that JWT.
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

    const { code, platform, redirect_uri } = await req.json();
    if (!code || !platform || !redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing code, platform, or redirect_uri" }), { status: 400 });
    }
    if (!["instagram", "facebook"].includes(platform)) {
      return new Response(JSON.stringify({ error: "Unsupported platform for OAuth" }), { status: 400 });
    }

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appId || !appSecret) {
      return new Response(JSON.stringify({ error: "Meta app credentials not configured on the server" }), { status: 500 });
    }

    // Step 1: exchange the short-lived code for a short-lived user token.
    const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirect_uri);
    tokenUrl.searchParams.set("code", code);

    const shortLivedRes = await fetch(tokenUrl.toString());
    const shortLived = await shortLivedRes.json();
    if (!shortLivedRes.ok) {
      return new Response(JSON.stringify({ error: "Meta rejected the authorization code", detail: shortLived }), { status: 400 });
    }

    // Step 2: exchange for a long-lived token (~60 days) so users don't
    // have to reconnect constantly.
    const longUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", appId);
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

    const longRes = await fetch(longUrl.toString());
    const longLived = await longRes.json();
    const finalToken = longRes.ok ? longLived.access_token : shortLived.access_token;
    const expiresInSec = longRes.ok ? longLived.expires_in : shortLived.expires_in;

    // Step 3: fetch the Pages (and linked Instagram accounts) this user manages.
    const pagesRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${finalToken}`
    );
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok || !pagesData.data?.length) {
      return new Response(JSON.stringify({ error: "No Pages found for this account. You need admin access to at least one Facebook Page." }), { status: 400 });
    }

    // Service-role client for writes that bypass RLS (this function has
    // already authenticated the user above).
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const expiresAt = expiresInSec ? new Date(Date.now() + expiresInSec * 1000).toISOString() : null;
    const inserted = [];

    for (const page of pagesData.data) {
      // Page-scoped token is what's actually used to send messages/replies.
      const pageTokenEncrypted = await encryptToken(page.access_token);

      if (platform === "facebook") {
        const { error } = await admin.from("social_accounts").upsert(
          {
            user_id: userData.user.id,
            platform: "facebook",
            account_name: page.name,
            external_account_id: page.id,
            access_token_encrypted: Array.from(pageTokenEncrypted),
            token_expires_at: expiresAt,
            status: "active",
            scopes: ["pages_messaging", "pages_manage_metadata"],
          },
          { onConflict: "user_id,platform,external_account_id" }
        );
        if (!error) inserted.push(page.name);
      }

      if (platform === "instagram" && page.instagram_business_account?.id) {
        const { error } = await admin.from("social_accounts").upsert(
          {
            user_id: userData.user.id,
            platform: "instagram",
            account_name: page.name,
            external_account_id: page.instagram_business_account.id,
            access_token_encrypted: Array.from(pageTokenEncrypted),
            token_expires_at: expiresAt,
            status: "active",
            scopes: ["instagram_manage_messages", "instagram_manage_comments"],
          },
          { onConflict: "user_id,platform,external_account_id" }
        );
        if (!error) inserted.push(page.name);
      }
    }

    await admin.from("audit_log").insert({
      user_id: userData.user.id,
      action: `connected_${platform}_account`,
      metadata: { accounts: inserted },
    });

    if (inserted.length === 0) {
      return new Response(JSON.stringify({ error: `No ${platform} account was found to connect.` }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, connected: inserted }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("oauth-callback error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
