import { createCanvas } from '@napi-rs/canvas'
import sharp from 'sharp'
import { v4 as uuidV4 } from 'uuid'
import { fetchImageBufferFromUrl } from '../infrastructure/FetchImageBufferFromUrl'
import { saveBufferToStorageOperation } from '../infrastructure/StorageOperation'

// 画像サイズの定数
const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 630

/**
 * 外部URLの画像にLGTMテキストを合成してCloud Storageに保存する
 * @param imageUrl - 元画像のURL
 * @param keyword - 検索キーワード（保存用、画像生成には使用しない）
 * @returns 生成されたLGTM画像の公開URL
 */
export const generateLgtmImageFromUrl = async (
  imageUrl: string,
  keyword: string,
): Promise<string> => {
  console.log('[generateLgtmImage] Start generating LGTM image', {
    imageUrl,
    keyword,
  })

  // 1. 外部URLから画像を取得
  const imageBuffer = await fetchImageBufferFromUrl(imageUrl)

  // 2. Sharpで画像をリサイズ
  const resizedImageBuffer = await sharp(imageBuffer)
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, {
      fit: 'cover', // アスペクト比を維持しつつトリミング
      position: 'center',
    })
    .toBuffer()

  // 3. Canvasで半透明の背景レイヤーを作成（テキストの視認性向上）
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const ctx = canvas.getContext('2d')

  // グラデーション背景（下部を暗くしてテキストを見やすく）
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const overlayBuffer = canvas.toBuffer('image/png')

  // 4. Canvasで「LGTM」テキストを描画
  const textCanvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const textCtx = textCanvas.getContext('2d')

  // LGTMの大きな文字
  const mainFontSize = 200
  const mainText = 'LGTM'

  // テキストに影をつける（視認性向上）
  textCtx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  textCtx.shadowBlur = 20
  textCtx.shadowOffsetX = 5
  textCtx.shadowOffsetY = 5

  // LGTMテキスト描画（太いゴシック体）
  textCtx.font = `900 ${mainFontSize}px "Arial Black", "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif`
  textCtx.fillStyle = '#FFFFFF'
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'middle'
  textCtx.fillText(mainText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)

  // "Looks Good To Me"の小さく細い文字
  const subFontSize = 40
  const subText = 'Looks Good To Me'

  // サブテキストの影（少し控えめに）
  textCtx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  textCtx.shadowBlur = 10
  textCtx.shadowOffsetX = 2
  textCtx.shadowOffsetY = 2

  // サブテキスト描画（細い文字）
  textCtx.font = `300 ${subFontSize}px "Arial", "Hiragino Sans", sans-serif`
  textCtx.fillStyle = '#FFFFFF'
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'top'
  textCtx.fillText(subText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120)

  const textBuffer = textCanvas.toBuffer('image/png')

  // 5. Sharpですべてのレイヤーを合成
  const outputBuffer = await sharp(resizedImageBuffer)
    .composite([
      { input: overlayBuffer, top: 0, left: 0 }, // 半透明オーバーレイ
      { input: textBuffer, top: 0, left: 0 }, // LGTMテキスト
    ])
    .webp({ quality: 85 }) // WebP形式で出力（軽量化）
    .toBuffer()

  console.log('[generateLgtmImage] Image composition completed')

  // 6. Cloud Storageに保存
  const fileName = `lgtm_${uuidV4()}.webp`
  const imagePublicUrl = await saveBufferToStorageOperation(
    {
      fileName,
      type: 'image/webp',
      data: outputBuffer,
    },
    'images', // Storageのパス
  )

  console.log('[generateLgtmImage] Image saved to Storage', {
    imagePublicUrl,
  })

  return imagePublicUrl
}

/**
 * Base64エンコードされた画像からLGTM画像を生成
 * @param base64Image - Base64エンコードされた画像データ（data:image/...;base64,を含む）
 * @returns 生成されたLGTM画像の公開URL
 */
export const generateLgtmImageFromBase64 = async (
  base64Image: string,
): Promise<string> => {
  console.log('[generateLgtmImage] Start generating LGTM image from base64')

  // Base64からBufferに変換
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
  const imageBuffer = Buffer.from(base64Data, 'base64')

  // 2. Sharpで画像をリサイズ
  const resizedImageBuffer = await sharp(imageBuffer)
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .toBuffer()

  // 3. Canvasで半透明の背景レイヤーを作成
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const overlayBuffer = canvas.toBuffer('image/png')

  // 4. Canvasで「LGTM」テキストを描画
  const textCanvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const textCtx = textCanvas.getContext('2d')

  // LGTMの大きな文字
  const mainFontSize = 200
  const mainText = 'LGTM'

  // テキストに影をつける（視認性向上）
  textCtx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  textCtx.shadowBlur = 20
  textCtx.shadowOffsetX = 5
  textCtx.shadowOffsetY = 5

  // LGTMテキスト描画（太いゴシック体）
  textCtx.font = `900 ${mainFontSize}px "Arial Black", "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif`
  textCtx.fillStyle = '#FFFFFF'
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'middle'
  textCtx.fillText(mainText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)

  // "Looks Good To Me"の小さく細い文字
  const subFontSize = 40
  const subText = 'Looks Good To Me'

  // サブテキストの影（少し控えめに）
  textCtx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  textCtx.shadowBlur = 10
  textCtx.shadowOffsetX = 2
  textCtx.shadowOffsetY = 2

  // サブテキスト描画（細い文字）
  textCtx.font = `300 ${subFontSize}px "Arial", "Hiragino Sans", sans-serif`
  textCtx.fillStyle = '#FFFFFF'
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'top'
  textCtx.fillText(subText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120)

  const textBuffer = textCanvas.toBuffer('image/png')

  // 5. Sharpですべてのレイヤーを合成
  const outputBuffer = await sharp(resizedImageBuffer)
    .composite([
      { input: overlayBuffer, top: 0, left: 0 },
      { input: textBuffer, top: 0, left: 0 },
    ])
    .webp({ quality: 85 })
    .toBuffer()

  console.log('[generateLgtmImage] Image composition completed')

  // 6. Cloud Storageに保存
  const fileName = `lgtm_${uuidV4()}.webp`
  const imagePublicUrl = await saveBufferToStorageOperation(
    {
      fileName,
      type: 'image/webp',
      data: outputBuffer,
    },
    'images',
  )

  console.log('[generateLgtmImage] Image saved to Storage', {
    imagePublicUrl,
  })

  return imagePublicUrl
}
