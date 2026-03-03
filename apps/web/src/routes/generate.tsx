import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  Image as ImageIcon,
  Loader2,
  Search,
  Upload,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { GeneratingImageDialog } from '@/components/GeneratingImageDialog'
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
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null,
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // キャッシュとデバウンス制御
  const searchCacheRef = useRef<Map<string, Array<SearchResultImage>>>(
    new Map(),
  )
  const lastSearchTimeRef = useRef<number>(0)

  // Google画像検索処理（メモ化）
  const handleGoogleSearch = useCallback(async () => {
    const trimmedKeyword = keyword.trim()

    // キーワードのバリデーション
    if (!trimmedKeyword) {
      setErrorMessage('キーワードを入力してください')
      return
    }

    if (trimmedKeyword.length > 100) {
      setErrorMessage('キーワードは100文字以内で入力してください')
      return
    }

    // 連続検索の防止（500ms以内の連続リクエストを防止）
    const now = Date.now()
    if (now - lastSearchTimeRef.current < 500) {
      return
    }
    lastSearchTimeRef.current = now

    // キャッシュチェック
    const cached = searchCacheRef.current.get(trimmedKeyword)
    if (cached) {
      setSearchResults(cached)
      setSelectedImage(null)
      setErrorMessage(null)
      return
    }

    setIsSearching(true)
    setSearchResults([])
    setSelectedImage(null)
    setErrorMessage(null)

    try {
      const functionsUrl =
        import.meta.env.VITE_FIREBASE_FUNCTIONS_URL ||
        'http://localhost:5001/lgtmonk-dev/us-central1/api'

      const response = await fetch(
        `${functionsUrl}/searchImages?keyword=${encodeURIComponent(trimmedKeyword)}&count=20`,
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'API request failed')
      }

      const results: Array<SearchResultImage> = await response.json()
      setSearchResults(results)
      // キャッシュに保存
      searchCacheRef.current.set(trimmedKeyword, results)

      if (results.length === 0) {
        setErrorMessage('検索結果が見つかりませんでした')
      }
    } catch (error) {
      console.error('Brave Image Search error:', error)
      if (error instanceof Error) {
        if (error.message.includes('not configured')) {
          setErrorMessage(
            'Brave Search APIの設定が完了していません。管理者にお問い合わせください。',
          )
        } else {
          setErrorMessage(error.message)
        }
      } else {
        setErrorMessage('画像検索に失敗しました。もう一度お試しください。')
      }
    } finally {
      setIsSearching(false)
    }
  }, [keyword])

  // 画像選択処理
  const handleSelectImage = (image: SearchResultImage) => {
    setSelectedImage(image)
  }

  // LGTM画像生成処理
  const handleGenerate = async () => {
    if (activeTab === 'google' && !selectedImage) return
    if (activeTab === 'upload' && !uploadedImage) return

    setIsGenerating(true)
    setErrorMessage(null)
    setGeneratedImageUrl(null)
    setIsDialogOpen(true) // ダイアログを開く

    try {
      let imageUrl: string

      if (activeTab === 'google' && selectedImage) {
        // Google画像検索からの生成
        const { generateLgtmImageFromUrl } = await import(
          '@/lib/api/generateLgtmImage'
        )
        imageUrl = await generateLgtmImageFromUrl(
          selectedImage.imageUrl,
          keyword.trim(),
        )
      } else if (activeTab === 'upload' && uploadedImage) {
        // アップロード画像からの生成
        const { generateLgtmImageFromFile } = await import(
          '@/lib/api/generateLgtmImage'
        )
        imageUrl = await generateLgtmImageFromFile(
          uploadedImage,
          '', // アップロードの場合はキーワードなし
        )
      } else {
        throw new Error('画像が選択されていません')
      }

      // Firestoreに保存
      await saveGeneratedImageToFirestore(imageUrl)

      // 生成された画像URLを設定
      setGeneratedImageUrl(imageUrl)
      console.log('LGTM画像が生成されました:', imageUrl)
    } catch (error) {
      console.error('LGTM画像生成エラー:', error)
      setIsDialogOpen(false) // エラー時はダイアログを閉じる
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage(
          'LGTM画像の生成に失敗しました。もう一度お試しください。',
        )
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Firestoreに生成した画像を保存
  const saveGeneratedImageToFirestore = async (
    imageUrl: string,
  ): Promise<string> => {
    console.log('[saveGeneratedImageToFirestore] 開始:', imageUrl)

    const { createImageOperation } = await import(
      '@/infrastructure/firestore/ImageOperations'
    )
    const { serverTimestamp, auth } = await import('@/lib/firebase')

    // 認証状態を確認（ログイン済みの場合はuidを取得）
    const userId = auth.currentUser?.uid || null

    console.log('[saveGeneratedImageToFirestore] ユーザーID:', userId)

    try {
      // imagesコレクションに保存（IDは自動生成）
      const imageId = await createImageOperation({
        copiedCount: 0,
        createdBy: userId,
        imageUrl,
        impressionCount: 0,
        keyword: activeTab === 'google' ? keyword.trim() : '',
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
      })

      console.log('[saveGeneratedImageToFirestore] 生成された画像ID:', imageId)
      console.log(
        '[saveGeneratedImageToFirestore] imagesコレクションへの保存成功',
      )

      // ログイン済みの場合、ユーザーの生成履歴にも保存
      if (userId) {
        await saveToUserGenerateHistory(userId, imageId, imageUrl)
      }

      console.log('[saveGeneratedImageToFirestore] 保存完了')
      return imageId
    } catch (error) {
      console.error('[saveGeneratedImageToFirestore] エラー:', error)
      throw new Error(
        'Firestoreへの保存に失敗しました。もう一度お試しください。',
      )
    }
  }

  // ユーザーの生成履歴に保存
  const saveToUserGenerateHistory = async (
    userId: string,
    imageId: string,
    imageUrl: string,
  ) => {
    console.log('[saveToUserGenerateHistory] 開始:', { userId, imageId })

    try {
      const { createGenerateOperation } = await import(
        '@/infrastructure/firestore/GenerateOperations'
      )
      const { serverTimestamp } = await import('@/lib/firebase')

      await createGenerateOperation(userId, imageId, {
        imageUrl,
        createdAt: serverTimestamp,
      })

      console.log('[saveToUserGenerateHistory] 保存成功')
    } catch (error) {
      console.error('[saveToUserGenerateHistory] エラー:', error)
      // 生成履歴の保存失敗はエラーとして扱わない（メイン処理は成功）
      console.warn('生成履歴の保存に失敗しましたが、処理を続行します')
    }
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
    <div className="bg-[#0d1117] text-[#c9d1d9]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* タブ切り替え */}
        <div className="flex gap-2 mb-4 border-b border-[#21262d]">
          <button
            type="button"
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
            type="button"
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
              <label
                htmlFor="keyword-input"
                className="block text-sm font-medium text-[#f0f6fc] mb-2"
              >
                Keyword
              </label>
              <div className="flex gap-2">
                <input
                  id="keyword-input"
                  type="text"
                  placeholder="cat, applause, amazing..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#c9d1d9] placeholder:text-[#6e7681] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                />
                <button
                  type="button"
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
                  {searchResults.map((image) => (
                    <button
                      type="button"
                      key={image.imageUrl}
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
            <p className="block text-sm font-medium text-[#f0f6fc] mb-2">
              Image file
            </p>
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
                    {uploadedImage?.name}{' '}
                    {uploadedImage?.size
                      ? `(${(uploadedImage.size / 1024 / 1024).toFixed(2)} MB)`
                      : ''}
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

        {/* フローティング生成ボタン */}
        {((activeTab === 'google' && selectedImage) ||
          (activeTab === 'upload' && uploadedImage)) && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/95 to-transparent pointer-events-none">
            <div className="max-w-4xl mx-auto pointer-events-auto">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 bg-[#238636] text-white text-sm font-medium rounded-md hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg"
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
          </div>
        )}
      </div>

      {/* 画像生成ダイアログ */}
      <GeneratingImageDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isGenerating={isGenerating}
        generatedImageUrl={generatedImageUrl}
        keyword={activeTab === 'google' ? keyword.trim() : undefined}
      />
    </div>
  )
}
