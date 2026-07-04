import { Link } from "react-router-dom";
import { Github, MessageCircle, AtSign, Send, ShieldCheck, Lock, GitBranch } from "lucide-react";
import { Footer } from "../components/Layout/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between px-6 py-6">
        <span className="font-display font-semibold text-xl">AutoFlow</span>
        <nav className="flex items-center gap-6 text-sm text-mute">
          <a href="#how" className="hover:text-ivory transition-colors">How it works</a>
          <a href="#security" className="hover:text-ivory transition-colors">Security</a>
          <a
            href="https://github.com/nadeemmhdm/autoflow-saas"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-ivory transition-colors"
          >
            <Github size={16} /> GitHub
          </a>
          <Link to="/login" className="hover:text-ivory transition-colors">Log in</Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-node bg-violet text-white hover:bg-violet-soft transition-colors"
          >
            Start free
          </Link>
        </nav>
      </header>

      {/* Hero: the signature element is a literal, live render of the product itself —
          a comment turning into a keyword match turning into a DM, wired like the
          drag-and-drop builder users will actually use. */}
      <section className="max-w-6xl mx-auto w-full px-6 pt-10 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-violet-soft mb-4">
            Open source · Meta official APIs · self-hosted
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-ivory">
            Every comment,
            <br />
            DM, and message —
            <br />
            <span className="text-violet-soft">wired to answer itself.</span>
          </h1>
          <p className="mt-6 text-mute text-lg max-w-md">
            Build Instagram, Facebook, and WhatsApp automations by dragging
            triggers and actions together. Your Meta API keys. Your Supabase
            database. Your rules.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link to="/signup" className="px-5 py-3 rounded-node bg-violet text-white font-medium hover:bg-violet-soft transition-colors">
              Create your workspace
            </Link>
            <a href="#how" className="px-5 py-3 rounded-node border border-line text-ivory hover:border-violet-soft transition-colors">
              See how it flows
            </a>
          </div>
        </div>

        <FlowHero />
      </section>

      <section id="how" className="max-w-6xl mx-auto w-full px-6 py-16 border-t border-line">
        <h2 className="font-display text-2xl font-semibold mb-10">Three channels, one flow builder</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <ChannelCard
            icon={<AtSign className="text-violet-soft" />}
            title="Instagram"
            desc="Auto-reply to comments with a DM, catch keyword DMs, respond to story mentions — via the Instagram Graph API."
          />
          <ChannelCard
            icon={<Send className="text-violet-soft" />}
            title="Facebook"
            desc="Page comment-to-DM, Messenger auto-responses, and mention handling through the Facebook Graph API."
          />
          <ChannelCard
            icon={<MessageCircle className="text-coral" />}
            title="WhatsApp"
            desc="Keyword-triggered replies, file and link delivery, and template messages via WhatsApp Cloud API."
          />
        </div>
      </section>

      <section id="security" className="max-w-6xl mx-auto w-full px-6 py-16 border-t border-line">
        <h2 className="font-display text-2xl font-semibold mb-10">Built to be trusted with real accounts</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <SecurityCard icon={<Lock size={18} />} title="Encrypted at rest" desc="Access tokens are encrypted before storage and never exposed through the API, not even to your own frontend." />
          <SecurityCard icon={<ShieldCheck size={18} />} title="Row Level Security" desc="Every table is scoped per user with Postgres RLS. One account can never see another's data." />
          <SecurityCard icon={<GitBranch size={18} />} title="Open source" desc="Audit every line. Self-host it, fork it, or run it as-is — the code is the trust boundary." />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ChannelCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-node bg-panel border border-line">
      <div className="mb-3">{icon}</div>
      <h3 className="font-display font-medium text-ivory mb-2">{title}</h3>
      <p className="text-sm text-mute">{desc}</p>
    </div>
  );
}

function SecurityCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-node bg-panel2 border border-line">
      <div className="mb-3 text-mint">{icon}</div>
      <h3 className="font-display font-medium text-ivory mb-2">{title}</h3>
      <p className="text-sm text-mute">{desc}</p>
    </div>
  );
}

function FlowHero() {
  return (
    <div className="relative rounded-node border border-line bg-panel p-6 shadow-glow overflow-hidden">
      <svg viewBox="0 0 460 300" className="w-full h-auto" role="img" aria-label="A comment triggers a keyword match, which triggers a DM being sent">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#5A43B8" />
          </marker>
        </defs>

        {/* Node 1: Comment trigger */}
        <g>
          <rect x="10" y="20" width="150" height="64" rx="10" fill="#232332" stroke="#2E2E40" />
          <circle cx="30" cy="40" r="4" fill="#3DDC84">
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="42" y="44" fill="#8C89A3" fontSize="10" fontFamily="JetBrains Mono">on_comment</text>
          <text x="24" y="64" fill="#F2F0F5" fontSize="13" fontFamily="Inter">"price pls 🙏"</text>
        </g>

        {/* connector 1 */}
        <path d="M160,52 C185,52 185,52 205,52" stroke="#5A43B8" strokeWidth="2" fill="none" markerEnd="url(#arrow)">
          <animate attributeName="stroke-dasharray" values="0,60;60,60" dur="1.2s" repeatCount="indefinite" />
        </path>

        {/* Node 2: keyword condition */}
        <g>
          <rect x="205" y="20" width="130" height="64" rx="10" fill="#232332" stroke="#7C5CFC" />
          <text x="219" y="44" fill="#9B82FF" fontSize="10" fontFamily="JetBrains Mono">if keyword</text>
          <text x="219" y="64" fill="#F2F0F5" fontSize="13" fontFamily="Inter">contains "price"</text>
        </g>

        <path d="M335,52 C360,52 360,52 380,52" stroke="#5A43B8" strokeWidth="2" fill="none" markerEnd="url(#arrow)">
          <animate attributeName="stroke-dasharray" values="0,45;45,45" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
        </path>

        {/* Node 3: send DM (drops down) */}
        <path d="M395,84 L395,160" stroke="#5A43B8" strokeWidth="2" fill="none" markerEnd="url(#arrow)">
          <animate attributeName="stroke-dasharray" values="0,80;80,80" dur="1.2s" begin="0.8s" repeatCount="indefinite" />
        </path>
        <g>
          <rect x="320" y="160" width="150" height="70" rx="10" fill="#232332" stroke="#FF6B4A" />
          <text x="334" y="184" fill="#FF6B4A" fontSize="10" fontFamily="JetBrains Mono">send_dm</text>
          <text x="334" y="205" fill="#F2F0F5" fontSize="12" fontFamily="Inter">"Here's our price</text>
          <text x="334" y="220" fill="#F2F0F5" fontSize="12" fontFamily="Inter">list 👇 [link]"</text>
        </g>

        {/* status pill */}
        <g transform="translate(10,240)">
          <rect width="180" height="30" rx="15" fill="#0F2E1E" />
          <circle cx="18" cy="15" r="4" fill="#3DDC84" />
          <text x="30" y="19" fill="#3DDC84" fontSize="11" fontFamily="JetBrains Mono">sent in 0.4s · via Graph API</text>
        </g>
      </svg>
    </div>
  );
}
