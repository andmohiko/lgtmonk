import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  Image as ImageIcon,
  Loader2,
  Search,
  Upload,
} from 'lucide-react'
import { useState } from 'react'
import { searchGoogleImages } from '@/lib/googleImageSearch'
import type { SearchResultImage } from '@/types/image'

export const Route = createFileRoute('/generate')({
  component: GeneratePage,
})

type TabType = 'google' | 'upload'

function GeneratePage() {
  const [activeTab, setActiveTab] = useState<TabType>('google')
  const [keyword, setKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<SearchResultImage>>(
    [],
  )
  const [selectedImage, setSelectedImage] = useState<SearchResultImage | null>(
    null,
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Google画像検索処理
  const handleGoogleSearch = async () => {
    if (!keyword.trim()) return

    setIsSearching(true)
    setSearchResults([])
    setSelectedImage(null)
    setErrorMessage(null)

    try {
      const results = await searchGoogleImages(keyword.trim(), 10)
      setSearchResults(results)

      if (results.length === 0) {
        setErrorMessage('検索結果が見つかりませんでした')
      }
    } catch (error) {
      console.error('Google Image Search error:', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '画像検索に失敗しました。もう一度お試しください。',
      )
    } finally {
      setIsSearching(false)
    }
  }

  // 画像選択処理
  const handleSelectImage = (image: SearchResultImage) => {
    setSelectedImage(image)
  }

  // LGTM画像生成処理（ロジックは後で実装）
  const handleGenerate = async () => {
    if (activeTab === 'google' && !selectedImage) return
    if (activeTab === 'upload' && !uploadedImage) return

    setIsGenerating(true)
    // TODO: Cloud Functionsの画像生成APIを呼び出す実装
    setTimeout(() => {
      setIsGenerating(false)
    }, 2000)
  }

  // 画像アップロード処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズは10MB以下にしてください')
      return
    }

    // ファイルタイプチェック
    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
      alert('JPEG、PNG、WebP、GIF形式の画像のみ対応しています')
      return
    }

    setUploadedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* タブ切り替え */}
        <div className="flex gap-2 mb-4 border-b border-[#21262d]">
          <button
            onClick={() => setActiveTab('google')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'google'
                ? 'text-[#f0f6fc]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Search className="w-4 h-4" />
            Search
            {activeTab === 'google' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f78166]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'upload'
                ? 'text-[#f0f6fc]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload
            {activeTab === 'upload' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f78166]" />
            )}
          </button>
        </div>

        {/* Google検索タブ */}
        {activeTab === 'google' && (
          <div className="space-y-4">
            {/* 検索ボックス */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
              <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
                Keyword
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="cat, applause, amazing..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGoogleSearch()
                  }}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#c9d1d9] placeholder:text-[#6e7681] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                />
                <button
                  onClick={handleGoogleSearch}
                  disabled={isSearching || !keyword.trim()}
                  className="px-4 py-2 bg-[#238636] text-white text-sm font-medium rounded-md hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span className="hidden sm:inline">Search</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 検索結果表示エリア */}
            {searchResults.length > 0 && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
                <h3 className="text-sm font-medium text-[#f0f6fc] mb-3">
                  Select an image
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {searchResults.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectImage(image)}
                      className={`relative aspect-square rounded-md overflow-hidden transition-all ${
                        selectedImage === image
                          ? 'ring-2 ring-[#58a6ff]'
                          : 'hover:opacity-80'
                      }`}
                    >
                      <img
                        src={image.thumbnailUrl}
                        alt={image.title}
                        className="w-full h-full object-cover bg-[#0d1117]"
                      />
                      {selectedImage === image && (
                        <div className="absolute inset-0 bg-[#58a6ff]/10 flex items-center justify-center">
                          <div className="w-6 h-6 bg-[#58a6ff] rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* エラーメッセージ表示 */}
            {errorMessage && (
              <div className="bg-[#161b22] border border-[#da3633] rounded-md p-4">
                <p className="text-sm text-[#f85149]">{errorMessage}</p>
              </div>
            )}

            {/* 検索結果が0件の場合 */}
            {!isSearching &&
              !errorMessage &&
              searchResults.length === 0 &&
              keyword && (
                <div className="bg-[#161b22] border border-[#30363d] rounded-md p-8 text-center">
                  <p className="text-sm text-[#8b949e]">No results found</p>
                </div>
              )}
          </div>
        )}

        {/* アップロードタブ */}
        {activeTab === 'upload' && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
            <label className="block text-sm font-medium text-[#f0f6fc] mb-2">
              Image file
            </label>
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full py-8 border-2 border-dashed border-[#30363d] rounded-md cursor-pointer hover:border-[#58a6ff] transition-colors group"
            >
              {previewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-32 max-w-full object-contain rounded"
                  />
                  <p className="text-xs text-[#8b949e]">
                    {uploadedImage?.name} (
                    {(uploadedImage?.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-[#6e7681] mb-2 group-hover:text-[#58a6ff] transition-colors" />
                  <p className="text-sm text-[#8b949e] group-hover:text-[#c9d1d9]">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-[#6e7681] mt-1">
                    JPEG, PNG, WebP, GIF (max 10MB)
                  </p>
                </>
              )}
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}

        {/* 生成ボタン */}
        {((activeTab === 'google' && selectedImage) ||
          (activeTab === 'upload' && uploadedImage)) && (
          <div className="mt-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2.5 bg-[#238636] text-white text-sm font-medium rounded-md hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate LGTM Image'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
