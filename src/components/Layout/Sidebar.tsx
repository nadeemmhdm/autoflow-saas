import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Workflow,
  Link2,
  KeyRound,
  Settings,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid },
  { to: "/automations", label: "Automations", icon: Workflow },
  { to: "/accounts", label: "Connected accounts", icon: Link2 },
  { to: "/api-keys", label: "API keys", icon: KeyRound },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { profile, signOut } = useAuth();

  return (
    <aside className="w-64 shrink-0 border-r border-line bg-panel flex flex-col">
      <div className="px-5 py-5 border-b border-line">
        <span className="font-display font-semibold text-lg text-ivory">AutoFlow</span>
        <span className="ml-2 text-[10px] uppercase tracking-wide text-violet-soft bg-violet/10 px-1.5 py-0.5 rounded">
          beta
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-node text-sm transition-colors ${
                isActive
                  ? "bg-violet/15 text-ivory"
                  : "text-mute hover:text-ivory hover:bg-panel2"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        {profile?.role === "admin" && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-node text-sm transition-colors ${
                isActive ? "bg-coral/15 text-ivory" : "text-mute hover:text-ivory hover:bg-panel2"
              }`
            }
          >
            <ShieldCheck size={17} />
            Admin
          </NavLink>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-line">
        <div className="px-3 py-2 mb-2 text-xs text-mute truncate">{profile?.email}</div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-node text-sm text-mute hover:text-coral hover:bg-panel2 transition-colors"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
