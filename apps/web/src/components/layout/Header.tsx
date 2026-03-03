import { Link, useRouterState } from '@tanstack/react-router'
import { Home, ImagePlus } from 'lucide-react'

export const Header = () => {
  const router = useRouterState()
  const isGeneratePage = router.location.pathname === '/generate'

  return (
    <header className="border-b border-[#21262d] bg-[#161b22]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="inline-block">
              <h1 className="text-2xl font-bold text-[#f0f6fc] hover:text-[#58a6ff] transition-colors">
                LGTMonk
              </h1>
            </Link>
            <p className="text-sm text-[#8b949e] mt-1">
              GitHub のプルリクエストに貼る LGTM 画像を、手軽に生成・検索・コピー
            </p>
          </div>
          {isGeneratePage ? (
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 bg-[#21262d] text-white text-sm font-medium rounded-md hover:bg-[#30363d] transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          ) : (
            <Link
              to="/generate"
              className="flex items-center gap-2 px-4 py-2 bg-[#238636] text-white text-sm font-medium rounded-md hover:bg-[#2ea043] transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Generate</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
