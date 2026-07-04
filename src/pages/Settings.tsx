import { useState, FormEvent } from "react";
import { DashboardLayout } from "../components/Layout/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Settings() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", user?.id);
    setSavedMsg("Saved.");
    setTimeout(() => setSavedMsg(null), 2000);
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) {
      setPwMsg("Use at least 10 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwMsg(error ? error.message : "Password updated.");
    setNewPassword("");
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-lg space-y-10">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ivory">Settings</h1>
          <p className="text-mute mt-1">Manage your profile and account security.</p>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <h2 className="font-display font-medium text-ivory">Profile</h2>
          <div>
            <label className="block text-sm text-mute mb-1.5">Email</label>
            <input disabled value={user?.email ?? ""} className="w-full px-3.5 py-2.5 rounded-node bg-panel2 border border-line text-mute" />
          </div>
          <div>
            <label className="block text-sm text-mute mb-1.5">Full name</label>
            <input
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-node bg-panel border border-line text-ivory outline-none focus:border-violet-soft"
            />
          </div>
          {savedMsg && <p className="text-sm text-mint">{savedMsg}</p>}
          <button type="submit" className="px-4 py-2.5 rounded-node bg-violet text-white text-sm font-medium hover:bg-violet-soft">
            Save profile
          </button>
        </form>

        <form onSubmit={changePassword} className="space-y-4 pt-6 border-t border-line">
          <h2 className="font-display font-medium text-ivory">Change password</h2>
          <input
            type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full px-3.5 py-2.5 rounded-node bg-panel border border-line text-ivory outline-none focus:border-violet-soft"
          />
          {pwMsg && <p className="text-sm text-mute">{pwMsg}</p>}
          <button type="submit" className="px-4 py-2.5 rounded-node border border-line text-ivory text-sm hover:border-violet-soft">
            Update password
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
