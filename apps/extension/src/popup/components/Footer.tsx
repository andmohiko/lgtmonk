import React from 'react'
import { Search, ImagePlus } from 'lucide-react'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://lgtm.mnhr.dev'

export const Footer: React.FC = () => {
  const handleOpenApp = (path: string = '/') => {
    chrome.tabs.create({ url: `${APP_URL}${path}` })
  }

  return (
    <div className="border-t border-[#21262d] bg-[#161b22] px-4 py-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleOpenApp('/')}
          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#21262d] text-[#c9d1d9] text-sm font-medium rounded-md hover:bg-[#30363d] transition-colors"
        >
          <Search className="w-4 h-4" />
          もっと画像を探す
        </button>
        <button
          type="button"
          onClick={() => handleOpenApp('/generate')}
          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#238636] text-white text-sm font-medium rounded-md hover:bg-[#2ea043] transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
          画像を生成する
        </button>
      </div>
    </div>
  )
}
