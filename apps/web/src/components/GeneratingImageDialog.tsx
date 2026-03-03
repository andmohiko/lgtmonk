import { Check, Copy, Loader2 } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type GeneratingImageDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  isGenerating: boolean
  generatedImageUrl: string | null
  keyword?: string
}

export function GeneratingImageDialog({
  open,
  onOpenChange,
  isGenerating,
  generatedImageUrl,
  keyword,
}: GeneratingImageDialogProps) {
  const [copiedType, setCopiedType] = useState<'url' | 'markdown' | null>(null)

  const handleCopy = async (text: string, type: 'url' | 'markdown') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    } catch (error) {
      console.error('コピーに失敗しました:', error)
      alert('コピーに失敗しました')
    }
  }

  const markdown = generatedImageUrl ? `![LGTM](${generatedImageUrl})` : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isGenerating ? 'Generating LGTM Image...' : 'LGTM Image Generated!'}
          </DialogTitle>
          {keyword && !isGenerating && (
            <DialogDescription>Keyword: {keyword}</DialogDescription>
          )}
        </DialogHeader>

        {/* ローディング表示 */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-16 h-16 text-[#58a6ff] animate-spin mb-4" />
            <p className="text-sm text-[#8b949e]">
              画像を生成しています...お待ちください
            </p>
          </div>
        )}

        {/* 生成完了後の画像表示 */}
        {!isGenerating && generatedImageUrl && (
          <>
            {/* 画像表示 */}
            <div className="flex items-center justify-center bg-[#0d1117] rounded-lg overflow-hidden">
              <img
                src={generatedImageUrl}
                alt={keyword || 'LGTM Image'}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>

            {/* コピーセクション */}
            <div className="space-y-4 mt-4">
              {/* Markdown */}
              <div>
                <label
                  htmlFor="markdown-text-gen"
                  className="block text-sm font-medium text-[#f0f6fc] mb-2"
                >
                  Markdown
                </label>
                <div className="flex gap-2">
                  <input
                    id="markdown-text-gen"
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
                  htmlFor="url-text-gen"
                  className="block text-sm font-medium text-[#f0f6fc] mb-2"
                >
                  Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="url-text-gen"
                    type="text"
                    readOnly
                    value={generatedImageUrl}
                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#c9d1d9] font-mono focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedImageUrl, 'url')}
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

            {/* 完了メッセージ */}
            <div className="mt-4 p-4 bg-[#238636]/10 border border-[#238636]/30 rounded-md">
              <p className="text-sm text-[#3fb950]">
                ✓ LGTM画像が正常に生成されました！
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
