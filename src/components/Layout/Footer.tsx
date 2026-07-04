import { Github } from "lucide-react";

/**
 * License requirement: every deployment of this open-source platform
 * must keep this attribution visible. See LICENSE for details.
 * Update REPO_URL and AUTHOR to your own fork's details if you maintain one,
 * but the "Powered by" line must remain per the MIT license notice.
 */
const REPO_URL = "https://github.com/nadeemmhdm/autoflow-saas";
const AUTHOR = "Nadeem Muhammed M";

export function Footer() {
  return (
    <footer className="border-t border-line bg-panel/60 py-6 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-mute">
        <p>
          <span className="text-ivory font-display font-medium">AutoFlow</span>{" "}
          — open-source automation for Instagram, Facebook &amp; WhatsApp, built on
          Meta's official APIs.
        </p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-ivory transition-colors"
        >
          <Github size={16} />
          <span>
            Powered by AutoFlow · {AUTHOR} on GitHub
          </span>
        </a>
      </div>
    </footer>
  );
}
