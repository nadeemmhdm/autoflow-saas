import { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { AtSign, Send, MessageCircle, CheckCircle2, XCircle } from "lucide-react";

interface SocialAccount {
  id: string;
  platform: "instagram" | "facebook" | "whatsapp";
  account_name: string;
  status: string;
  token_expires_at: string | null;
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
          />
          <AccountRow
            icon={<Send className="text-violet-soft" />}
            title="Facebook Page"
            desc="Comment-to-DM and Messenger automation"
            account={findAccount("facebook")}
            onConnect={() => startMetaOAuth("facebook")}
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
  icon, title, desc, account, onConnect,
}: {
  icon: React.ReactNode; title: string; desc: string; account?: SocialAccount; onConnect: () => void;
}) {
  return (
    <div className="p-5 rounded-node bg-panel border border-line flex items-center justify-between">
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
      <button
        onClick={onConnect}
        className="px-4 py-2 rounded-node border border-line text-sm text-ivory hover:border-violet-soft transition-colors"
      >
        {account ? "Reconnect" : "Connect"}
      </button>
    </div>
  );
}
