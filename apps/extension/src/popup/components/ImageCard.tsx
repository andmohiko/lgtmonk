import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { Image } from '../../shared/types/Image'
import { incrementCopiedCountOperation } from '../../shared/imageOperations'

type ImageCardProps = {
  image: Image
}

export const ImageCard: React.FC<ImageCardProps> = ({ image }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const markdown = `![LGTM](${image.imageUrl})`

    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      // コピーカウントをインクリメント
      await incrementCopiedCountOperation(image.imageId)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('コピーに失敗しました')
    }
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="w-full h-32 overflow-hidden rounded-md bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff] transition-all"
      >
        {/* 画像 */}
        <div className="relative h-full bg-[#0d1117]">
          <img
            src={image.imageUrl}
            alt={image.keyword || 'LGTM Image'}
            className="w-full h-full object-contain"
          />

          {/* ホバー時のオーバーレイ（コピーしていない時のみ） */}
          {!copied && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <Copy className="w-6 h-6 text-white" />
              <p className="text-white text-sm font-medium">コピーする</p>
            </div>
          )}

          {/* コピー完了時のオーバーレイ */}
          {copied && (
            <div className="absolute inset-0 bg-[#238636]/90 flex flex-col items-center justify-center gap-2">
              <Check className="w-6 h-6 text-white" />
              <p className="text-white text-sm font-medium">コピーしました</p>
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
