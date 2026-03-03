import { createCanvas } from '@napi-rs/canvas'
import sharp from 'sharp'
import { v4 as uuidV4 } from 'uuid'
import { fetchImageBufferFromUrl } from '../infrastructure/FetchImageBufferFromUrl'
import { saveBufferToStorageOperation } from '../infrastructure/StorageOperation'
import { registerWorkSansFonts } from '../utils/registerFonts'

// 画像サイズの定数
const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 630

// フォントを初回のみ登録
let fontsRegistered = false
const ensureFontsRegistered = (): void => {
  if (!fontsRegistered) {
    registerWorkSansFonts()
    fontsRegistered = true
  }
}

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

  // 0. フォントを登録（初回のみ）
  ensureFontsRegistered()

  // 1. 外部URLから画像を取得
  const imageBuffer = await fetchImageBufferFromUrl(imageUrl)

  // 2. Sharpで画像をリサイズ
  const resizedImageBuffer = await sharp(imageBuffer)
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, {
      fit: 'cover', // アスペクト比を維持しつつトリミング
      position: 'center',
    })
    .toBuffer()

  // 3. Canvasで薄い黒レイヤーを作成
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const ctx = canvas.getContext('2d')

  // 薄い黒レイヤー（画像全体に均一に）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const overlayBuffer = canvas.toBuffer('image/png')

  // 4. Canvasで「LGTM」テキストを描画
  const textCanvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const textCtx = textCanvas.getContext('2d')

  // LGTMの大きな文字
  const mainFontSize = 200
  const mainText = 'LGTM'

  // LGTMテキスト描画（Work Sans Black使用）
  const mainFontSpec = `${mainFontSize}px "Work Sans Black"`
  textCtx.font = mainFontSpec
  console.log('[generateLgtmImage] Main text font set to:', mainFontSpec)
  console.log('[generateLgtmImage] Actual font being used:', textCtx.font)
  textCtx.fillStyle = '#FFFFFF'
  textCtx.strokeStyle = '#FFFFFF'
  textCtx.lineWidth = 8 // 太い縁取りで文字を強調
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'middle'
  textCtx.lineJoin = 'round' // 滑らかな線の結合
  textCtx.miterLimit = 2

  // 縦長になるのを防ぐため、水平方向に1.2倍に拡大
  textCtx.save() // 現在の状態を保存
  textCtx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30) // 描画位置に移動
  textCtx.scale(1.2, 1) // 水平方向に1.2倍に拡大
  textCtx.translate(-CANVAS_WIDTH / 2, -(CANVAS_HEIGHT / 2 - 30)) // 元の位置に戻す

  // 縁取りを先に描画
  textCtx.strokeText(mainText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)
  // 塗りつぶしを上から描画
  textCtx.fillText(mainText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)

  textCtx.restore() // 保存した状態に戻す

  // "Looks Good To Me"の小さめの文字
  const subFontSize = 40
  const subText = 'Looks Good To Me'

  // サブテキスト描画（Work Sans Regular使用）
  textCtx.font = `${subFontSize}px "Work Sans"`
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

  // 0. フォントを登録（初回のみ）
  ensureFontsRegistered()

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

  // 3. Canvasで薄い黒レイヤーを作成
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const ctx = canvas.getContext('2d')

  // 薄い黒レイヤー（画像全体に均一に）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const overlayBuffer = canvas.toBuffer('image/png')

  // 4. Canvasで「LGTM」テキストを描画
  const textCanvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const textCtx = textCanvas.getContext('2d')

  // LGTMの大きな文字
  const mainFontSize = 200
  const mainText = 'LGTM'

  // LGTMテキスト描画（Work Sans Black使用）
  const mainFontSpec = `${mainFontSize}px "Work Sans Black"`
  textCtx.font = mainFontSpec
  console.log('[generateLgtmImage] Main text font set to:', mainFontSpec)
  console.log('[generateLgtmImage] Actual font being used:', textCtx.font)
  textCtx.fillStyle = '#FFFFFF'
  textCtx.strokeStyle = '#FFFFFF'
  textCtx.lineWidth = 8 // 太い縁取りで文字を強調
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'middle'
  textCtx.lineJoin = 'round' // 滑らかな線の結合
  textCtx.miterLimit = 2

  // 縦長になるのを防ぐため、水平方向に1.2倍に拡大
  textCtx.save() // 現在の状態を保存
  textCtx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30) // 描画位置に移動
  textCtx.scale(1.2, 1) // 水平方向に1.2倍に拡大
  textCtx.translate(-CANVAS_WIDTH / 2, -(CANVAS_HEIGHT / 2 - 30)) // 元の位置に戻す

  // 縁取りを先に描画
  textCtx.strokeText(mainText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)
  // 塗りつぶしを上から描画
  textCtx.fillText(mainText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)

  textCtx.restore() // 保存した状態に戻す

  // "Looks Good To Me"の小さめの文字
  const subFontSize = 40
  const subText = 'Looks Good To Me'

  // サブテキスト描画（Work Sans Regular使用）
  textCtx.font = `${subFontSize}px "Work Sans"`
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
