import { ExternalLink } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="border-t border-[#21262d] bg-[#0d1117]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-3 text-xs text-[#8b949e]">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <a
              href="https://andmohiko.notion.site/LGTMonk-31fbcd408ffa80b793d5c925ef592d47"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#58a6ff] transition-colors"
            >
              利用規約
            </a>
            <span className="text-[#484f58]">·</span>
            <a
              href="https://andmohiko.notion.site/LGTMonk-Chrome-31dbcd408ffa8020884aced0b524f83e"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#58a6ff] transition-colors"
            >
              プライバシーポリシー
            </a>
            <span className="text-[#484f58]">·</span>
            <a
              href="https://x.com/andmohiko"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[#58a6ff] transition-colors"
            >
              Developer X
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-[#484f58]">·</span>
            <a
              href="https://github.com/andmohiko/lgtmonk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[#58a6ff] transition-colors"
            >
              GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[#6e7681]">© 2026 LGTMonk</p>
        </div>
      </div>
    </footer>
  )
}
