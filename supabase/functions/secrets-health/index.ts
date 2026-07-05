import { createClient } from "npm:@supabase/supabase-js@2";

const REQUIRED_SECRETS = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "META_GRAPH_API_VERSION",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "TOKEN_ENCRYPTION_KEY",
];

Deno.serve(async (req: Request) => {
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

    // Admin-only: check the caller's role via service role (bypasses RLS
    // deliberately, but only to read this one user's own role).
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", userData.user.id).single();
    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admins only" }), { status: 403 });
    }

    // Only ever return booleans/format hints — never the actual value.
    const status = REQUIRED_SECRETS.map((name) => {
      const value = Deno.env.get(name);
      let state: "missing" | "configured" | "looks_invalid" = "missing";
      if (value) {
        state = "configured";
        if (name === "TOKEN_ENCRYPTION_KEY") {
          try {
            const decoded = atob(value);
            if (decoded.length !== 32) state = "looks_invalid";
          } catch {
            state = "looks_invalid";
          }
        }
      }
      return { name, state };
    });

    return new Response(JSON.stringify({ secrets: status }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("secrets-health error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
