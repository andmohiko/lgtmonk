import React from 'react'
import { RefreshCw } from 'lucide-react'

type HeaderProps = {
  onReload: () => void
  isLoading: boolean
}

export const Header: React.FC<HeaderProps> = ({ onReload, isLoading }) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#21262d]">
      <h1 className="text-lg font-bold text-[#f0f6fc]">LGTMonk</h1>
      <button
        onClick={onReload}
        disabled={isLoading}
        className="p-1.5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] rounded-md transition-colors disabled:opacity-50"
        aria-label="Reload images"
      >
        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
