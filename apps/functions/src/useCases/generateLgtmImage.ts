import { createCanvas } from '@napi-rs/canvas'
import sharp from 'sharp'
import { v4 as uuidV4 } from 'uuid'
import { fetchImageBufferFromUrl } from '../infrastructure/FetchImageBufferFromUrl'
import { saveBufferToStorageOperation } from '../infrastructure/StorageOperation'
import { registerWorkSansFonts } from '../utils/registerFonts'

// 定数
const MAX_IMAGE_SIZE = 1200
const OVERLAY_OPACITY_URL = 0.05
const OVERLAY_OPACITY_BASE64 = 0.1

// フォントを初回のみ登録
let fontsRegistered = false
const ensureFontsRegistered = (): void => {
  if (!fontsRegistered) {
    registerWorkSansFonts()
    fontsRegistered = true
  }
}

/**
 * 画像サイズを最大1200pxに制限する（アスペクト比を保持）
 */
const calculateResizedDimensions = (
  originalWidth: number,
  originalHeight: number,
): {
  imageWidth: number
  imageHeight: number
  needsResize: boolean
} => {
  const maxDimension = Math.max(originalWidth, originalHeight)

  if (maxDimension <= MAX_IMAGE_SIZE) {
    return {
      imageWidth: originalWidth,
      imageHeight: originalHeight,
      needsResize: false,
    }
  }

  const scale = MAX_IMAGE_SIZE / maxDimension
  const imageWidth = Math.round(originalWidth * scale)
  const imageHeight = Math.round(originalHeight * scale)

  console.log('[generateLgtmImage] Resizing image:', {
    originalWidth,
    originalHeight,
    newWidth: imageWidth,
    newHeight: imageHeight,
    scale,
  })

  return { imageWidth, imageHeight, needsResize: true }
}

/**
 * 薄い黒のオーバーレイレイヤーを作成
 */
const createOverlayLayer = (
  width: number,
  height: number,
  opacity: number,
): Buffer => {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`
  ctx.fillRect(0, 0, width, height)

  return canvas.toBuffer('image/png')
}

/**
 * LGTMテキストレイヤーを作成
 */
const createTextLayer = (width: number, height: number): Buffer => {
  const textCanvas = createCanvas(width, height)
  const textCtx = textCanvas.getContext('2d')

  const mainText = 'LGTM'
  const horizontalPadding = 40
  const maxTextWidth = width - horizontalPadding * 2

  // 画像サイズに応じて初期フォントサイズを設定
  let baseFontSize = Math.min(width, height) * 0.3
  let mainLetterSpacing = baseFontSize * 0.16

  // フォントを設定してテキスト幅を計測
  textCtx.font = `${baseFontSize}px "Work Sans Black"`
  textCtx.save()
  textCtx.scale(1.2, 1)

  // テキスト幅を計算（scaleを考慮）
  let mainTextWidth = Array.from(mainText).reduce(
    (acc, char) => acc + textCtx.measureText(char).width + mainLetterSpacing,
    -mainLetterSpacing,
  )

  textCtx.restore()

  // テキスト幅が最大幅を超える場合、フォントサイズを調整
  if (mainTextWidth > maxTextWidth) {
    const scale = maxTextWidth / mainTextWidth
    baseFontSize = baseFontSize * scale
    mainLetterSpacing = baseFontSize * 0.16

    // 再計算
    textCtx.font = `${baseFontSize}px "Work Sans Black"`
    textCtx.save()
    textCtx.scale(1.2, 1)
    mainTextWidth = Array.from(mainText).reduce(
      (acc, char) => acc + textCtx.measureText(char).width + mainLetterSpacing,
      -mainLetterSpacing,
    )
    textCtx.restore()
  }

  console.log('[generateLgtmImage] Font size adjusted:', {
    baseFontSize,
    mainTextWidth,
    maxTextWidth,
  })

  // LGTMテキスト描画（Work Sans Black使用）
  const mainFontSpec = `${baseFontSize}px "Work Sans Black"`
  textCtx.font = mainFontSpec
  console.log('[generateLgtmImage] Main text font set to:', mainFontSpec)
  console.log('[generateLgtmImage] Actual font being used:', textCtx.font)
  textCtx.fillStyle = '#FFFFFF'
  textCtx.strokeStyle = '#FFFFFF'
  textCtx.lineWidth = baseFontSize * 0.05
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'middle'
  textCtx.lineJoin = 'round'
  textCtx.miterLimit = 2

  // 縦長になるのを防ぐため、水平方向に1.2倍に拡大
  const mainTextYPosition = height / 2
  textCtx.save()
  textCtx.translate(width / 2, mainTextYPosition)
  textCtx.scale(1.2, 1)
  textCtx.translate(-width / 2, -mainTextYPosition)

  // letter spacingを適用して文字を個別に描画
  let mainCurrentX = width / 2 - mainTextWidth / 2

  Array.from(mainText).forEach((char) => {
    const charWidth = textCtx.measureText(char).width
    // 縁取りを先に描画
    textCtx.strokeText(char, mainCurrentX + charWidth / 2, mainTextYPosition)
    // 塗りつぶしを上から描画
    textCtx.fillText(char, mainCurrentX + charWidth / 2, mainTextYPosition)
    mainCurrentX += charWidth + mainLetterSpacing
  })

  textCtx.restore()

  // "Looks Good To Me"の小さめの文字
  const subFontSize = baseFontSize * 0.16
  const subText = 'Looks Good To Me'
  const subTextYPosition = height / 2 + baseFontSize * 0.6

  // サブテキスト描画（Work Sans Regular使用）
  textCtx.font = `${subFontSize}px "Work Sans"`
  textCtx.fillStyle = '#FFFFFF'
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'top'

  // メインテキストの横幅に合わせてletter spacingを調整
  const subTextChars = Array.from(subText)
  const subTextWidthWithoutSpacing = subTextChars.reduce(
    (acc, char) => acc + textCtx.measureText(char).width,
    0,
  )
  const adjustedSubLetterSpacing =
    ((mainTextWidth * 1.2 - subTextWidthWithoutSpacing) /
      (subTextChars.length - 1)) *
    0.85

  // letter spacingを適用して文字を個別に描画
  const subTextWidth = subTextChars.reduce(
    (acc, char) =>
      acc + textCtx.measureText(char).width + adjustedSubLetterSpacing,
    -adjustedSubLetterSpacing,
  )
  let subCurrentX = width / 2 - subTextWidth / 2

  subTextChars.forEach((char) => {
    const charWidth = textCtx.measureText(char).width
    textCtx.fillText(char, subCurrentX + charWidth / 2, subTextYPosition)
    subCurrentX += charWidth + adjustedSubLetterSpacing
  })

  return textCanvas.toBuffer('image/png')
}

/**
 * 画像バッファにLGTMテキストを合成してStorageに保存する共通処理
 */
const processLgtmImage = async (
  imageBuffer: Buffer,
  overlayOpacity: number,
): Promise<string> => {
  // 元画像のメタデータを取得
  const metadata = await sharp(imageBuffer).metadata()
  const originalWidth = metadata.width || 1200
  const originalHeight = metadata.height || 630

  console.log('[generateLgtmImage] Original image size:', {
    width: originalWidth,
    height: originalHeight,
  })

  // 画像サイズを最大1200pxに制限（アスペクト比を保持）
  const { imageWidth, imageHeight, needsResize } = calculateResizedDimensions(
    originalWidth,
    originalHeight,
  )

  // オーバーレイとテキストレイヤーを作成
  const overlayBuffer = createOverlayLayer(imageWidth, imageHeight, overlayOpacity)
  const textBuffer = createTextLayer(imageWidth, imageHeight)

  // 元画像をリサイズ（必要な場合のみ）
  let resizedImageBuffer: Buffer = imageBuffer
  if (needsResize) {
    resizedImageBuffer = await sharp(imageBuffer)
      .resize(imageWidth, imageHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()
  }

  // すべてのレイヤーを合成
  const outputBuffer = await sharp(resizedImageBuffer)
    .composite([
      { input: overlayBuffer, top: 0, left: 0 },
      { input: textBuffer, top: 0, left: 0 },
    ])
    .webp({ quality: 85 })
    .toBuffer()

  console.log('[generateLgtmImage] Image composition completed')

  // Cloud Storageに保存
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

  ensureFontsRegistered()

  // 外部URLから画像を取得
  const imageBuffer = await fetchImageBufferFromUrl(imageUrl)

  return processLgtmImage(imageBuffer, OVERLAY_OPACITY_URL)
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

  ensureFontsRegistered()

  // Base64からBufferに変換
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
  const imageBuffer = Buffer.from(base64Data, 'base64')

  return processLgtmImage(imageBuffer, OVERLAY_OPACITY_BASE64)
}
