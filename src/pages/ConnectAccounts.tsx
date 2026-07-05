import { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { AtSign, Send, MessageCircle, CheckCircle2, XCircle, ShieldQuestion } from "lucide-react";

interface SocialAccount {
  id: string;
  platform: "instagram" | "facebook" | "whatsapp";
  account_name: string;
  status: string;
  token_expires_at: string | null;
}

interface PermissionCheck {
  platform?: string;
  granted?: string[];
  missing?: string[];
  healthy?: boolean;
  note?: string;
  error?: string;
}

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const REDIRECT_URI = `${window.location.origin}/oauth/callback`;

function startMetaOAuth(platform: "instagram" | "facebook") {
  if (!META_APP_ID) {
    alert("Meta App ID isn't configured yet. Add VITE_META_APP_ID once your Meta app is approved (see README setup guide).");
    return;
  }
  const scopes =
    platform === "instagram"
      ? "instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list"
      : "pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement";

  const url = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  url.searchParams.set("client_id", META_APP_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", platform);
  url.searchParams.set("response_type", "code");
  window.location.href = url.toString();
}

export default function ConnectAccounts() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [permChecks, setPermChecks] = useState<Record<string, PermissionCheck>>({});
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("social_accounts_safe")
      .select("id, platform, account_name, status, token_expires_at")
      .then(({ data }) => {
        setAccounts((data as SocialAccount[]) ?? []);
        setLoading(false);
      });
  }, []);

  const findAccount = (platform: string) => accounts.find((a) => a.platform === platform);

  const checkPermissions = async (accountId: string) => {
    setChecking(accountId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ social_account_id: accountId }),
      });
      const body = await res.json();
      setPermChecks((prev) => ({ ...prev, [accountId]: body }));
    } finally {
      setChecking(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl">
        <h1 className="font-display text-2xl font-semibold text-ivory">Connected accounts</h1>
        <p className="text-mute mt-1">
          Authorize through Meta's official login. AutoFlow only requests the scopes each
          automation type needs, and tokens are encrypted before they're stored.
        </p>

        <div className="mt-8 space-y-4">
          <AccountRow
            icon={<AtSign className="text-violet-soft" />}
            title="Instagram"
            desc="Comment-to-DM, DM automation, story replies"
            account={findAccount("instagram")}
            onConnect={() => startMetaOAuth("instagram")}
            onCheckPermissions={checkPermissions}
            checking={checking}
            permCheck={findAccount("instagram") ? permChecks[findAccount("instagram")!.id] : undefined}
          />
          <AccountRow
            icon={<Send className="text-violet-soft" />}
            title="Facebook Page"
            desc="Comment-to-DM and Messenger automation"
            account={findAccount("facebook")}
            onConnect={() => startMetaOAuth("facebook")}
            onCheckPermissions={checkPermissions}
            checking={checking}
            permCheck={findAccount("facebook") ? permChecks[findAccount("facebook")!.id] : undefined}
          />
          <AccountRow
            icon={<MessageCircle className="text-coral" />}
            title="WhatsApp Business"
            desc="Keyword replies, template messages, media"
            account={findAccount("whatsapp")}
            onConnect={() =>
              alert(
                "WhatsApp connects via a System User token from Meta Business Manager. See the README setup guide for the exact steps, then add it under Settings → WhatsApp."
              )
            }
          />
        </div>

        {!loading && accounts.length === 0 && (
          <p className="mt-6 text-sm text-mute">No accounts connected yet.</p>
        )}
      </div>
    </DashboardLayout>
  );
}

function AccountRow({
  icon, title, desc, account, onConnect, onCheckPermissions, checking, permCheck,
}: {
  icon: React.ReactNode; title: string; desc: string; account?: SocialAccount; onConnect: () => void;
  onCheckPermissions?: (accountId: string) => void; checking?: string | null; permCheck?: PermissionCheck;
}) {
  return (
    <div className="p-5 rounded-node bg-panel border border-line">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-node bg-panel2 flex items-center justify-center">{icon}</div>
          <div>
            <h3 className="font-display font-medium text-ivory">{title}</h3>
            <p className="text-sm text-mute">{desc}</p>
            {account && (
              <p className="text-xs text-mute mt-1 flex items-center gap-1.5">
                {account.status === "active" ? (
                  <CheckCircle2 size={13} className="text-mint" />
                ) : (
                  <XCircle size={13} className="text-coral" />
                )}
                {account.account_name} · {account.status}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account && onCheckPermissions && (
            <button
              onClick={() => onCheckPermissions(account.id)}
              disabled={checking === account.id}
              className="p-2 rounded-node border border-line text-mute hover:text-ivory hover:border-violet-soft"
              title="Check granted permissions"
            >
              <ShieldQuestion size={16} />
            </button>
          )}
          <button
            onClick={onConnect}
            className="px-4 py-2 rounded-node border border-line text-sm text-ivory hover:border-violet-soft transition-colors"
          >
            {account ? "Reconnect" : "Connect"}
          </button>
        </div>
      </div>

      {permCheck && (
        <div className="mt-3 pt-3 border-t border-line text-xs">
          {permCheck.error ? (
            <p className="text-coral">{permCheck.error}</p>
          ) : permCheck.note ? (
            <p className="text-mute">{permCheck.note}</p>
          ) : (
            <div>
              <p className={permCheck.healthy ? "text-mint" : "text-amber"}>
                {permCheck.healthy ? "All required permissions granted" : "Missing permissions:"}
              </p>
              {!permCheck.healthy && permCheck.missing && (
                <p className="text-mute mt-1">{permCheck.missing.join(", ")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
