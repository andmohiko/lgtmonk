import type { Image } from '@lgtmonk/common'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Clock,
  Heart,
  ImagePlus,
  Loader2,
  RefreshCw,
  Shuffle,
} from 'lucide-react'
import { useState } from 'react'
import { ImageDetailDialog } from '@/components/ImageDetailDialog'
import { useImages } from '@/hooks/useImages'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { images, error, isLoading, displayMode, setDisplayMode, refetch } =
    useImages()
  const [selectedImage, setSelectedImage] = useState<Image | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 画像クリック時の処理
  const handleImageClick = (image: Image) => {
    setSelectedImage(image)
    setIsDialogOpen(true)
  }

  return (
    <div className="bg-[#0d1117] text-[#c9d1d9]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* タブ切り替え */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 border-b border-[#21262d] flex-1">
            <TabButton
              active={displayMode === 'latest'}
              onClick={() => setDisplayMode('latest')}
              icon={<Clock className="w-4 h-4" />}
              label="Latest"
            />
            <TabButton
              active={displayMode === 'random'}
              onClick={() => setDisplayMode('random')}
              icon={<Shuffle className="w-4 h-4" />}
              label="Random"
            />
            <TabButton
              active={displayMode === 'favorites'}
              onClick={() => setDisplayMode('favorites')}
              icon={<Heart className="w-4 h-4" />}
              label="Favorites"
            />
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="ml-4 p-2 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] rounded-md transition-colors disabled:opacity-50"
            aria-label="Reload"
          >
            <RefreshCw
              className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-[#161b22] border border-[#da3633] rounded-md p-4">
            <p className="text-sm text-[#f85149]">{error}</p>
          </div>
        )}

        {/* ローディング表示 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#58a6ff] animate-spin mb-4" />
            <p className="text-sm text-[#8b949e]">Loading images...</p>
          </div>
        )}

        {/* 画像一覧 */}
        {!isLoading && !error && images.length === 0 ? (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-12 text-center">
            <p className="text-sm text-[#8b949e] mb-4">
              {displayMode === 'favorites'
                ? 'お気に入りがまだありません'
                : '画像がまだありません'}
            </p>
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#238636] text-white text-sm font-medium rounded-md hover:bg-[#2ea043] transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              最初の画像を生成する
            </Link>
          </div>
        ) : (
          !isLoading &&
          !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((image) => (
                <button
                  type="button"
                  key={image.imageId}
                  onClick={() => handleImageClick(image)}
                  className="group relative bg-[#161b22] border border-[#30363d] rounded-md overflow-hidden hover:border-[#58a6ff] transition-all cursor-pointer text-left"
                >
                  {/* 画像 */}
                  <div className="aspect-square relative bg-[#0d1117]">
                    <img
                      src={image.imageUrl}
                      alt={image.keyword || 'LGTM Image'}
                      className="w-full h-full object-contain"
                    />
                    {/* ホバー時のオーバーレイ */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-sm font-medium">
                        Click to view
                      </p>
                    </div>
                  </div>
                  {/* キーワード表示（あれば） */}
                  {image.keyword && (
                    <div className="p-2 border-t border-[#30363d]">
                      <p className="text-xs text-[#8b949e] truncate">
                        {image.keyword}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* 画像詳細ダイアログ */}
      <ImageDetailDialog
        image={selectedImage}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}

// タブボタンコンポーネント
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
        active ? 'text-[#f0f6fc]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
      }`}
    >
      {icon}
      {label}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f78166]" />
      )}
    </button>
  )
}
