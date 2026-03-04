import type { Image } from '@lgtmonk/common'
import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  incrementCopiedCountOperation,
  incrementImpressionCountOperation,
} from '@/infrastructure/firestore/ImageOperations'
import { logImageCopy } from '@/lib/analytics'

type ImageDetailDialogProps = {
  image: Image | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageDetailDialog({
  image,
  open,
  onOpenChange,
}: ImageDetailDialogProps) {
  const [copiedType, setCopiedType] = useState<'url' | 'markdown' | null>(null)

  // モーダルが開いたときに表示回数をインクリメント
  useEffect(() => {
    if (open && image) {
      incrementImpressionCountOperation(image.imageId).catch((error) => {
        console.error('表示回数のインクリメントに失敗しました:', error)
      })
    }
  }, [open, image])

  if (!image) return null

  const imageUrl = image.imageUrl
  const markdown = `![LGTM](${imageUrl})`

  const handleCopy = async (text: string, type: 'url' | 'markdown') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)

      // コピーカウントをインクリメント
      await incrementCopiedCountOperation(image.imageId)

      // Analyticsイベントを記録
      logImageCopy(image.imageId, image.keyword)
    } catch (error) {
      console.error('コピーに失敗しました:', error)
      alert('コピーに失敗しました')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>LGTM Image</DialogTitle>
          <DialogDescription>
            画像をクリップボードにコピーして使用できます
          </DialogDescription>
        </DialogHeader>

        {/* 画像表示 */}
        <div className="flex items-center justify-center bg-[#0d1117] rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={image.keyword || 'LGTM Image'}
            className="max-w-full max-h-[60vh] object-contain"
          />
        </div>

        {/* コピーセクション */}
        <div className="space-y-4 mt-4">
          {/* Markdown */}
          <div>
            <label
              htmlFor="markdown-text"
              className="block text-sm font-medium text-[#f0f6fc] mb-2"
            >
              Markdown
            </label>
            <div className="flex gap-2">
              <input
                id="markdown-text"
                type="text"
                readOnly
                value={markdown}
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#c9d1d9] font-mono focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
              />
              <button
                type="button"
                onClick={() => handleCopy(markdown, 'markdown')}
                className="px-4 py-2 bg-[#238636] text-white text-sm font-medium rounded-md hover:bg-[#2ea043] transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {copiedType === 'markdown' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* URL */}
          <div>
            <label
              htmlFor="url-text"
              className="block text-sm font-medium text-[#f0f6fc] mb-2"
            >
              Image URL
            </label>
            <div className="flex gap-2">
              <input
                id="url-text"
                type="text"
                readOnly
                value={imageUrl}
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#c9d1d9] font-mono focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
              />
              <button
                type="button"
                onClick={() => handleCopy(imageUrl, 'url')}
                className="px-4 py-2 bg-[#21262d] text-white text-sm font-medium rounded-md hover:bg-[#30363d] transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {copiedType === 'url' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* キーワード表示 */}
        {image.keyword && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md px-4 py-3">
            <p className="text-sm text-[#8b949e]">
              キーワード:{' '}
              <span className="text-[#c9d1d9] font-medium">
                {image.keyword}
              </span>
            </p>
          </div>
        )}

        {/* 統計情報（オプション） */}
        <div className="flex gap-4 text-xs text-[#8b949e] pt-4 border-t border-[#30363d]">
          <div>
            Copied: <span className="text-[#c9d1d9]">{image.copiedCount}</span>{' '}
            times
          </div>
          <div>
            Views:{' '}
            <span className="text-[#c9d1d9]">{image.impressionCount}</span>{' '}
            times
          </div>
          {image.createdAt && (
            <div>
              Created:{' '}
              <span className="text-[#c9d1d9]">
                {new Date(image.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
