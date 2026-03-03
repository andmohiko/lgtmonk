# Firebase Cloud Functions Canvas画像生成スキル

Firebase Cloud Functions上で@napi-rs/canvasとSharpを使い、動的にOGP画像などを生成してCloud Storageに保存する実装パターン。OGP画像生成、動的画像合成、Canvas描画、テキスト付き画像生成、レイヤー合成などに関するタスクで使用すること。Cloud Functions・Node.js環境での画像処理全般、canvas/sharp連携、Storage保存フローにも適用可能。

## アーキテクチャ

```
クライアント → Cloud Functions API → 画像生成処理 → Cloud Storage
```

### 処理フロー

1. 外部画像URLから画像をfetch
2. Sharpで画像をリサイズ
3. Canvasで画像合成・テキスト描画・エフェクト追加
4. 生成した画像をCloud Storageに保存
5. 公開URLを返却

## 必要なパッケージ

```json
{
  "dependencies": {
    "@napi-rs/canvas": "^0.1.65",
    "sharp": "^0.33.5",
    "axios": "^1.7.9",
    "uuid": "^11.0.3",
    "firebase-admin": "^12.1.0",
    "firebase-functions": "^5.0.0"
  }
}
```

### パッケージの役割

- **@napi-rs/canvas**: Node.js環境で動作する高速Canvas実装。Cloud Functions上で安定動作
- **sharp**: 高速な画像リサイズ・合成ライブラリ

## ディレクトリ構造

```
functions/
├── src/
│   ├── api/                              # APIエンドポイント
│   │   └── {feature}/
│   │       └── generateImagePath.ts      # リクエストハンドラー
│   ├── useCases/
│   │   └── generateImage.ts              # 画像生成ロジック
│   ├── infrastructure/
│   │   ├── FetchImageBufferFromUrl.ts    # 画像取得
│   │   └── StorageOperation.ts           # Storage操作
│   └── utils/
│       └── canvasText.ts                 # テキスト描画ヘルパー
```

## 実装パターン

### 1. 画像取得ヘルパー

**infrastructure/FetchImageBufferFromUrl.ts**

```typescript
import axios from 'axios'

export const fetchImageBuffer = async (url: string): Promise<Buffer> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  return Buffer.from(response.data, 'binary')
}
```

**ポイント**: `responseType: 'arraybuffer'`でバイナリデータとして取得

### 2. テキスト描画ヘルパー

**utils/canvasText.ts**

```typescript
import type { SKRSContext2D } from '@napi-rs/canvas'

export const drawCanvasText = (
  ctx: SKRSContext2D,
  fontSize: number,
  font: string,
  color: string,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'start',
  baseline: CanvasTextBaseline = 'alphabetic',
  fontWeight: string = '',
) => {
  ctx.textBaseline = baseline
  ctx.textAlign = align
  ctx.font = `${fontWeight} ${fontSize}px ${font}`
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}
```

### 3. Storage保存

**infrastructure/StorageOperation.ts**

```typescript
import { storageBucket } from '../firebase'

export const saveBufferToStorageOperation = async (
  file: {
    fileName: string
    type: string
    data: Buffer
  },
  storagePath: string,
): Promise<string> => {
  const fileRef = storageBucket.file(`${storagePath}/${file.fileName}`)
  await fileRef.save(file.data, {
    contentType: file.type,
  })
  await fileRef.makePublic()
  return fileRef.publicUrl()
}
```

### 4. メイン画像生成ロジック

**useCases/generateImage.ts**

```typescript
import { createCanvas } from '@napi-rs/canvas'
import sharp from 'sharp'
import { v4 as uuidV4 } from 'uuid'
import { fetchImageBuffer } from '../infrastructure/FetchImageBufferFromUrl'
import { saveBufferToStorageOperation } from '../infrastructure/StorageOperation'
import { drawCanvasText } from '../utils/canvasText'

const canvasWidth = 1200
const canvasHeight = 630

export const generateImage = async (
  imagePath: string,
  text: string,
  uploadPath: string,
): Promise<string> => {
  // 1. 画像を取得
  const thumbnailBuffer = await fetchImageBuffer(imagePath)
  const logoBuffer = await fetchImageBuffer(process.env.LOGO_URL!)

  // 2. Sharpでリサイズ
  const resizedThumbnail = await sharp(thumbnailBuffer)
    .resize(canvasWidth, canvasHeight)
    .toBuffer()
  const resizedLogo = await sharp(logoBuffer).resize(240, 140).toBuffer()

  // 3. Canvasでエフェクト生成
  const canvas = createCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext('2d')

  // グラデーションレイヤー
  const gradient = ctx.createLinearGradient(0, 437, 0, 630)
  gradient.addColorStop(0, 'rgba(34, 34, 34, 0)')
  gradient.addColorStop(1, '#222222')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 437, canvasWidth, 193)

  // グリッドレイヤー
  ctx.beginPath()
  ctx.strokeStyle = '#ff00ff'
  ctx.lineWidth = 1
  for (let x = 0; x <= canvasWidth; x += 100) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasHeight)
  }
  for (let y = 0; y <= canvasHeight; y += 100) {
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
  }
  ctx.stroke()
  const gridBuffer = canvas.toBuffer('image/png')

  // テキスト描画
  drawCanvasText(
    ctx,
    60,
    'Hiragino Maru Gothic ProN',
    '#ffffff',
    text,
    22,
    568,
    'left',
    'middle',
    'bold',
  )
  const textImageBuffer = canvas.toBuffer('image/png')

  // 4. Sharpで全レイヤーを合成
  const outputBuffer = await sharp(resizedThumbnail)
    .composite([
      { input: gridBuffer, top: 0, left: 0 },
      { input: textImageBuffer, top: 0, left: 0 },
      { input: resizedLogo, top: 458, left: 928 },
    ])
    .toBuffer()

  // 5. Storageに保存
  const fileUrl = await saveBufferToStorageOperation(
    {
      fileName: `${uuidV4()}.png`,
      type: 'image/png',
      data: outputBuffer,
    },
    uploadPath,
  )
  return fileUrl
}
```

### 5. APIエンドポイント

**api/feature/generateImagePath.ts**

```typescript
import type { Request, Response } from 'express'
import { generateImage } from '../../useCases/generateImage'

exports.handle = async (req: Request, res: Response) => {
  try {
    const { imagePath, text, userId } = req.body
    const uploadPath = `images/users/${userId}`

    const imageUrl = await generateImage(imagePath, text, uploadPath)
    return res.status(200).send({ imageUrl })
  } catch (error) {
    console.error(error)
    return res.status(500).send({ error })
  }
}
```

## Canvas vs Sharp の使い分け

### Canvasを使う場面
- テキスト描画（フォント、サイズ、色の細かい制御）
- 図形描画（グラデーション、罫線、パターン）
- 複雑なエフェクト（1つのレイヤーで複数の要素を描画）

### Sharpを使う場面
- 画像リサイズ（高速で高品質）
- 複数レイヤーの合成（`composite()`で複数画像を重ねる）
- 最終出力（Buffer形式で効率的に出力）

## レイヤー構造

```
[最終画像]
  ├─ ベース画像 (Sharp でリサイズした背景)
  ├─ グリッドレイヤー (Canvas で生成 → Buffer化)
  ├─ テキストレイヤー (Canvas で生成 → Buffer化)
  └─ ロゴレイヤー (Sharp でリサイズ)
```

## Buffer変換パターン

```typescript
// パターン1: Canvas → Buffer (エフェクトレイヤー用)
const gridBuffer = canvas.toBuffer('image/png')

// パターン2: Sharp → Buffer (リサイズ用)
const resizedImage = await sharp(buffer).resize(w, h).toBuffer()

// パターン3: 最終合成 → Buffer (Storage保存用)
const outputBuffer = await sharp(base).composite([...]).toBuffer()
```

## ベストプラクティス

### 1. フォントの取り扱い
- システムフォント: 'Hiragino Maru Gothic ProN', 'Noto Sans JP'
- カスタムフォントを使う場合は別途フォントファイルの配置が必要

### 2. 画像サイズ最適化
- OGP画像推奨サイズ: 1200x630px
- Cloud Functionsのメモリ制限に注意（デフォルト256MB）

### 3. エラーハンドリング
```typescript
try {
  const buffer = await fetchImageBuffer(url)
  // 処理
} catch (error) {
  console.error('画像取得エラー:', error)
  throw error
}
```

### 4. パフォーマンス最適化
- 画像取得を並列化: `Promise.all([fetch1, fetch2])`
- 不要な中間Buffer生成を避ける

### 5. セキュリティ
- 外部URL検証: 信頼できるドメインからのみ画像を取得
- パストラバーサル対策: ユーザー入力をそのままパスに使わない

## 環境変数

```bash
# Firebase Functions設定
firebase functions:config:set logo.url="https://example.com/logo.png"
```

## 別プロジェクトへの移植手順

1. パッケージインストール
```bash
npm install @napi-rs/canvas sharp axios uuid
npm install -D @types/uuid
```

2. コアファイルをコピー
   - utils/canvasText.ts
   - infrastructure/FetchImageBufferFromUrl.ts
   - infrastructure/StorageOperation.ts
   - useCases/generateImage.ts

3. カスタマイズ
   - Canvas サイズ
   - レイヤー構成
   - フォント、色、配置

4. APIエンドポイント作成

5. 環境変数設定
