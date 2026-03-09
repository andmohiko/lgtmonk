# F-03: LGTM画像生成（アップロード）実装タスク

## 概要

ユーザーがローカルから画像ファイル（JPEG/PNG/WebP/GIF）をアップロードし、LGTM テキストを合成した画像を生成する機能を実装します。

**要件定義**: `docs/spec.md` F-03 (L70-L76)

## 実装状況

### ✅ 完了済み（既存実装）

#### バックエンド（Cloud Functions）
- **画像生成ロジック**: `/apps/functions/src/useCases/generateLgtmImage.ts`
  - `generateLgtmImageFromBase64()` 関数が完全実装済み
  - base64エンコード画像を受け取り、sharp + napi-rs/canvasでLGTMテキストを合成
  - WebP形式でFirebase Storageに保存し、公開URLを返却

- **API エンドポイント**: `/apps/functions/src/api/generateLgtmImage/generateLgtmImage.ts`
  - `base64Image` パラメータを受け付け済み
  - base64フォーマットのバリデーション実装済み
  - 現在の課題: `keyword.trim().length > 0` の検証があり、空文字列が許可されていない（L36）

- **Storage 操作**: `/apps/functions/src/infrastructure/StorageOperation.ts`
  - 画像保存・URL生成機能が完全実装済み
  - エミュレーター対応済み

#### フロントエンド（TanStack Start）
- **API クライアント**: `/apps/web/src/lib/api/generateLgtmImage.ts`
  - `generateLgtmImageFromFile()` 関数が実装済み
  - FileをFileReaderでbase64に変換し、Cloud Functions APIに送信

- **UI コンポーネント**: `/apps/web/src/components/GeneratingImageDialog.tsx`
  - 生成中・完了・エラー表示のダイアログが実装済み
  - 画像プレビュー、コピーボタン、ダウンロードボタンを搭載

- **Firestore 操作**:
  - `/apps/web/src/infrastructure/firestore/ImageOperations.ts` - 画像メタデータ保存
  - `/apps/web/src/infrastructure/firestore/GenerateOperations.ts` - ユーザー生成履歴保存

### 🚧 未実装（要実装）

#### フロントエンドUI (`/apps/web/src/routes/generate.tsx`)
- アップロードタブのUI実装（現在コメントアウト: L282-L440）
- ファイル入力機能
- バリデーション機能
- プレビュー機能
- エラーハンドリング

---

## 実装タスク

### Phase 1: バックエンド調整（15分）

#### Task 1-1: keyword空文字列の許可

**ファイル**: `/apps/functions/src/api/generateLgtmImage/generateLgtmImage.ts`

**現状のコード** (L36付近):
```typescript
if (!keyword || keyword.trim().length === 0) {
  return res.status(400).json({ error: 'keyword is required' })
}
```

**変更内容**:
```typescript
// アップロード時は空文字列を許可（検索対象外として扱う）
if (keyword === undefined || keyword === null) {
  return res.status(400).json({ error: 'keyword parameter is required' })
}
// 空文字列はOK（アップロード時）、trimした結果も保存
```

**理由**:
- spec.md L160: アップロード時は `keyword` フィールドを空文字列とする
- Google検索時は必須、アップロード時は空文字列を許可

**テスト**:
- Google検索フローが正常動作すること（keyword必須）
- アップロードフローで空文字列が受け付けられること

---

### Phase 2: フロントエンドUI実装（2-3時間）

#### Task 2-1: アップロードタブUIの有効化

**ファイル**: `/apps/web/src/routes/generate.tsx`

**変更箇所**:
1. **タブボタンの表示** (L185付近)
   ```typescript
   <TabsList className="grid w-full grid-cols-2"> {/* grid-cols-1 から変更 */}
     <TabsTrigger value="google">Google画像検索</TabsTrigger>
     <TabsTrigger value="upload">画像アップロード</TabsTrigger> {/* 表示 */}
   </TabsList>
   ```

2. **アップロードタブコンテンツの実装** (L282-L440)
   ```tsx
   <TabsContent value="upload" className="mt-6">
     <div className="space-y-4">
       {/* ファイル入力エリア */}
       <FileUploadArea
         onFileSelect={handleFileSelect}
         acceptedFormats={['image/jpeg', 'image/png', 'image/webp', 'image/gif']}
         maxSize={10 * 1024 * 1024} // 10MB
       />

       {/* プレビューエリア */}
       {uploadedImage && (
         <ImagePreview
           file={uploadedImage}
           onClear={() => setUploadedImage(null)}
         />
       )}

       {/* 生成ボタン */}
       <Button
         onClick={handleGenerateFromUpload}
         disabled={!uploadedImage || isGenerating}
         className="w-full"
       >
         LGTM画像を生成
       </Button>
     </div>
   </TabsContent>
   ```

**アクセシビリティ対応**:
- `TabsTrigger` に適切な `aria-label`
- キーボードナビゲーション（Tab、矢印キー）
- フォーカス可視化

---

#### Task 2-2: ファイル入力コンポーネントの実装

**新規コンポーネント**: `/apps/web/src/components/FileUploadArea.tsx`（または generate.tsx内に実装）

**機能要件**:
1. **ファイル選択**
   - `<input type="file">` を内包
   - クリックでファイル選択ダイアログを開く
   - `accept` 属性で形式を制限: `image/jpeg,image/png,image/webp,image/gif`

2. **ドラッグ&ドロップ**
   - `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop` イベント処理
   - ドラッグ中の視覚的フィードバック（背景色変更、ボーダー強調）
   - ドロップ時のファイル取得とバリデーション

3. **視覚デザイン**
   - 破線ボーダーの大きなドロップエリア
   - アイコン（UploadCloud など）
   - 説明テキスト「ファイルをドラッグ&ドロップ、またはクリックして選択」
   - 対応形式とサイズ制限の表示

**実装例**:
```tsx
type FileUploadAreaProps = {
  onFileSelect: (file: File) => void
  acceptedFormats: string[]
  maxSize: number
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFileSelect,
  acceptedFormats,
  maxSize,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // 形式チェック
    if (!acceptedFormats.includes(file.type)) {
      return `対応していない形式です。JPEG, PNG, WebP, GIFのみ対応しています。`
    }
    // サイズチェック
    if (file.size > maxSize) {
      return `ファイルサイズが大きすぎます。最大${maxSize / 1024 / 1024}MBまで対応しています。`
    }
    return null
  }

  const handleFile = (file: File) => {
    const error = validateFile(file)
    if (error) {
      // エラートースト表示
      toast.error(error)
      return
    }
    onFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragEnter={() => setIsDragging(true)}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      aria-label="画像ファイルをアップロード"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          fileInputRef.current?.click()
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">
        ファイルをドラッグ&ドロップ、またはクリックして選択
      </p>
      <p className="mt-1 text-xs text-gray-500">
        JPEG, PNG, WebP, GIF (最大10MB)
      </p>
    </div>
  )
}
```

**アクセシビリティ対応**:
- `role="button"` でドロップエリアをボタンとして認識
- `tabIndex={0}` でキーボードフォーカス可能に
- `onKeyDown` で Enter/Space キーでファイル選択
- `aria-label` で目的を明示

---

#### Task 2-3: 画像プレビューコンポーネントの実装

**新規コンポーネント**: `/apps/web/src/components/ImagePreview.tsx`（または generate.tsx内に実装）

**機能要件**:
1. **プレビュー表示**
   - `FileReader.readAsDataURL()` でbase64に変換して表示
   - 最大幅/高さを制限（例: max-w-md, max-h-96）
   - オブジェクトフィット: contain

2. **ファイル情報表示**
   - ファイル名
   - ファイルサイズ（KB/MB表示）
   - 画像形式

3. **クリアボタン**
   - ×ボタンで選択解除
   - `onClear` コールバック実行

**実装例**:
```tsx
type ImagePreviewProps = {
  file: File
  onClear: () => void
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ file, onClear }) => {
  const [preview, setPreview] = useState<string>('')

  useEffect(() => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [file])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="relative border rounded-lg p-4 bg-gray-50">
      <button
        onClick={onClear}
        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
        aria-label="画像を削除"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col items-center gap-4">
        {preview && (
          <img
            src={preview}
            alt="アップロード画像プレビュー"
            className="max-w-md max-h-96 object-contain rounded"
          />
        )}

        <div className="text-sm text-gray-600 text-center">
          <p className="font-medium">{file.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {file.type.replace('image/', '').toUpperCase()} • {formatFileSize(file.size)}
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

#### Task 2-4: 状態管理とハンドラーの実装

**ファイル**: `/apps/web/src/routes/generate.tsx`

**状態追加**:
```typescript
const [uploadedImage, setUploadedImage] = useState<File | null>(null)
```

**ハンドラー実装**:

1. **ファイル選択ハンドラー**
```typescript
const handleFileSelect = (file: File) => {
  setUploadedImage(file)
}
```

2. **生成ハンドラー（アップロード用）**
```typescript
const handleGenerateFromUpload = async () => {
  if (!uploadedImage) return

  setIsGenerating(true)
  setGeneratingDialogOpen(true)

  try {
    // 既存のgenerateLgtmImageFromFile()を使用
    const imageUrl = await generateLgtmImageFromFile(
      uploadedImage,
      '' // keyword は空文字列
    )

    setGeneratedImageUrl(imageUrl)

    // Firestore に保存（ログイン時のみ）
    if (uid) {
      await createImageOperation({
        imageUrl,
        keyword: '', // 空文字列で保存
        impressionCount: 0,
        copiedCount: 0,
        createdBy: uid,
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
      })

      // ユーザーの生成履歴にも追加
      await createGenerateOperation(uid, {
        imageUrl,
        createdAt: serverTimestamp,
      })
    }

    toast.success('LGTM画像を生成しました')
  } catch (error) {
    console.error('画像生成エラー:', error)
    setGeneratedImageUrl(null)
    toast.error('画像の生成に失敗しました', {
      description: error instanceof Error ? error.message : '不明なエラー',
    })
  } finally {
    setIsGenerating(false)
  }
}
```

**タブ切り替え時の処理**:
```typescript
const handleTabChange = (value: string) => {
  setActiveTab(value as TabType)

  // タブ切り替え時に選択状態をリセット
  if (value === 'google') {
    setUploadedImage(null)
  } else if (value === 'upload') {
    setSearchKeyword('')
    setSearchResults([])
    setSelectedImageUrl('')
  }
}
```

---

#### Task 2-5: エラーハンドリングの強化

**エラーケース**:
1. **ファイル形式エラー**
   - サポート外の形式（TIFF, BMPなど）
   - メッセージ: 「対応していない形式です。JPEG, PNG, WebP, GIFのみ対応しています。」

2. **ファイルサイズエラー**
   - 10MBを超える
   - メッセージ: 「ファイルサイズが大きすぎます。最大10MBまで対応しています。」

3. **base64変換エラー**
   - FileReader失敗
   - メッセージ: 「ファイルの読み込みに失敗しました。別のファイルをお試しください。」

4. **API呼び出しエラー**
   - ネットワークエラー、タイムアウト、サーバーエラー
   - メッセージ: 「画像の生成に失敗しました。時間をおいて再度お試しください。」

5. **認証エラー**
   - 未ログイン時のFirestore保存失敗（許容、ローカル生成のみ）
   - メッセージ: なし（生成は成功として扱う）

**実装パターン**:
```typescript
try {
  // 処理
} catch (error) {
  console.error('エラー詳細:', error)

  if (error instanceof Error) {
    if (error.message.includes('network')) {
      toast.error('ネットワークエラー', {
        description: 'インターネット接続を確認してください',
      })
    } else if (error.message.includes('timeout')) {
      toast.error('タイムアウト', {
        description: 'しばらく時間をおいてから再度お試しください',
      })
    } else {
      toast.error('エラーが発生しました', {
        description: error.message,
      })
    }
  } else {
    toast.error('不明なエラーが発生しました')
  }
}
```

---

#### Task 2-6: アクセシビリティの最終チェック

**チェック項目**:
- [ ] キーボードのみで全操作が可能
  - Tab キーでフォーカス移動
  - Enter/Space でボタン実行
  - 矢印キーでタブ切り替え
- [ ] スクリーンリーダー対応
  - `aria-label` が適切に設定されている
  - フォーム要素に `<label>` が関連付けられている
  - エラーメッセージが `aria-live` で通知される
- [ ] フォーカス可視化
  - `:focus-visible` でフォーカスリングが表示される
  - コントラスト比が十分（WCAG AA基準）
- [ ] エラー表示
  - エラーメッセージが視覚的にも音声的にも伝わる
  - エラー箇所が明確に識別できる

**修正例**:
```tsx
{/* エラーメッセージのアクセシビリティ */}
{error && (
  <div role="alert" aria-live="assertive" className="text-red-600 text-sm mt-2">
    {error}
  </div>
)}

{/* ボタンの disabled 状態を伝える */}
<Button
  disabled={!uploadedImage || isGenerating}
  aria-disabled={!uploadedImage || isGenerating}
  aria-label={
    !uploadedImage
      ? '画像を選択してください'
      : isGenerating
      ? '生成中...'
      : 'LGTM画像を生成'
  }
>
  {isGenerating ? '生成中...' : 'LGTM画像を生成'}
</Button>
```

---

### Phase 3: テスト（30分）

#### Task 3-1: 機能テスト

**テストケース**:

| ID | テスト内容 | 期待結果 |
|----|-----------|---------|
| T-01 | JPEG画像をアップロード | 正常に生成される |
| T-02 | PNG画像をアップロード | 正常に生成される |
| T-03 | WebP画像をアップロード | 正常に生成される |
| T-04 | GIF画像をアップロード | 正常に生成される |
| T-05 | 10MB以下の画像 | 正常に生成される |
| T-06 | 10MBを超える画像 | エラーメッセージ表示 |
| T-07 | 非対応形式（TIFF） | エラーメッセージ表示 |
| T-08 | ドラッグ&ドロップ | 正常に選択される |
| T-09 | タブ切り替え | 状態がリセットされる |
| T-10 | 生成後のコピー | クリップボードにコピーされる |
| T-11 | ログイン時の保存 | Firestoreに保存される |
| T-12 | 未ログイン時の生成 | 生成のみ成功（保存なし） |

**実施手順**:
1. ローカル環境で動作確認
2. エミュレーターでFirestore保存を確認
3. 本番環境で動作確認

---

#### Task 3-2: クロスブラウザテスト

**テスト対象ブラウザ**:
- Chrome（最新版）
- Firefox（最新版）
- Safari（最新版）
- Edge（最新版）

**テスト項目**:
- ファイル選択ダイアログ
- ドラッグ&ドロップ
- base64変換
- プレビュー表示
- 生成処理

---

#### Task 3-3: レスポンシブデザインテスト

**テスト対象デバイス**:
- スマートフォン（375px〜）
- タブレット（768px〜）
- デスクトップ（1024px〜）

**確認項目**:
- レイアウト崩れがない
- ボタンがタッチしやすいサイズ
- プレビュー画像が適切に表示される
- モーダルが正常に動作する

---

## 実装チェックリスト

### バックエンド
- [ ] keyword空文字列を許可する変更
- [ ] 既存のGoogle検索フローに影響がないことを確認

### フロントエンド
- [ ] アップロードタブUIの有効化
- [ ] FileUploadAreaコンポーネント実装
- [ ] ImagePreviewコンポーネント実装
- [ ] ファイル選択ハンドラー実装
- [ ] 生成ハンドラー実装
- [ ] ドラッグ&ドロップ対応
- [ ] ファイルバリデーション実装
- [ ] エラーハンドリング実装
- [ ] アクセシビリティ対応

### テスト
- [ ] 全ファイル形式の動作確認
- [ ] エラーケースの動作確認
- [ ] クロスブラウザテスト
- [ ] レスポンシブデザイン確認
- [ ] キーボード操作確認
- [ ] スクリーンリーダー確認

---

## 参考リンク

- **要件定義**: `docs/spec.md` (F-03: L70-L76)
- **既存実装**:
  - バックエンド: `apps/functions/src/useCases/generateLgtmImage.ts`
  - API: `apps/functions/src/api/generateLgtmImage/generateLgtmImage.ts`
  - フロントエンド: `apps/web/src/routes/generate.tsx`
  - APIクライアント: `apps/web/src/lib/api/generateLgtmImage.ts`

---

## 見積もり

- **Phase 1（バックエンド調整）**: 15分
- **Phase 2（フロントエンドUI実装）**: 2-3時間
- **Phase 3（テスト）**: 30分

**合計**: 約3-4時間
