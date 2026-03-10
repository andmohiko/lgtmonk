import type { Image } from '@lgtmonk/common'
import { Check, Copy, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { FavoriteButton } from '@/components/FavoriteButton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useDeleteImageMutation } from '@/hooks/useDeleteImageMutation'
import { useIsLocal } from '@/hooks/useIsLocal'
import {
  incrementCopiedCountOperation,
  incrementImpressionCountOperation,
} from '@/infrastructure/firestore/ImageOperations'
import { logImageCopy } from '@/lib/analytics'

type ImageDetailDialogProps = {
  image: Image | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
  isFavorite: boolean
  onToggleFavorite: (imageId: string, imageUrl: string) => void
}

export function ImageDetailDialog({
  image,
  open,
  onOpenChange,
  onDelete,
  isFavorite,
  onToggleFavorite,
}: ImageDetailDialogProps) {
  const [copiedType, setCopiedType] = useState<'url' | 'markdown' | null>(null)
  const { deleteImage, isDeleting } = useDeleteImageMutation()
  const isLocal = useIsLocal()

  // 早期リターンの前に必要な値を準備
  const imageUrl = image?.imageUrl ?? ''
  const markdown = `![LGTM](${imageUrl})`

  const handleCopy = useCallback(
    async (text: string, type: 'url' | 'markdown') => {
      if (!image) return

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
    },
    [image],
  )

  // モーダルが開いたときに表示回数をインクリメント
  useEffect(() => {
    if (open && image) {
      incrementImpressionCountOperation(image.imageId).catch((error) => {
        console.error('表示回数のインクリメントに失敗しました:', error)
      })
    }
  }, [open, image])

  // キーボードショートカット（c キーでMarkdownをコピー）
  useEffect(() => {
    if (!open || !image) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は無視
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // c キーでMarkdownをコピー
      if (event.key === 'c' || event.key === 'C') {
        event.preventDefault()
        handleCopy(markdown, 'markdown')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, image, markdown, handleCopy])

  if (!image) return null

  const handleDelete = async () => {
    if (!image) return

    const confirmed = window.confirm(
      'この画像を削除してもよろしいですか？この操作は取り消せません。',
    )
    if (!confirmed) return

    try {
      await deleteImage(image.imageId, image.imageUrl)
      alert('画像を削除しました')
      onOpenChange(false)
      onDelete?.()
    } catch (error) {
      console.error('削除に失敗しました:', error)
      alert('削除に失敗しました。再度お試しください。')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 削除ボタン（ローカル環境のみ） */}
        {isLocal && (
          <div className="absolute top-4 right-12 z-10">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title="画像を削除（ローカル環境のみ）"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? '削除中...' : '削除'}
            </button>
          </div>
        )}

        {/* 画像表示 */}
        <div className="relative flex items-center justify-center bg-[#0d1117] rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={image.keyword || 'LGTM Image'}
            className="max-w-full max-h-[60vh] object-contain"
          />
          {/* お気に入りボタン（画像の右下） */}
          <div className="absolute bottom-4 right-4">
            <FavoriteButton
              imageId={image.imageId}
              imageUrl={image.imageUrl}
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
              size="md"
              variant="default"
            />
          </div>
        </div>

        {/* コピーセクション */}
        <div className="space-y-4 mt-4">
          {/* Markdown */}
          <div>
            <label
              htmlFor="markdown-text"
              className="block text-sm font-medium text-[#f0f6fc] mb-2 flex items-center gap-2"
            >
              Markdown
              <span className="text-xs text-[#8b949e] font-normal">
                (Press <kbd className="px-1.5 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[10px] font-mono">C</kbd> to copy)
              </span>
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
