import { createCanvas } from '@napi-rs/canvas'
import sharp from 'sharp'
import { v4 as uuidV4 } from 'uuid'
import { fetchImageBufferFromUrl } from '../infrastructure/FetchImageBufferFromUrl'
import { saveBufferToStorageOperation } from '../infrastructure/StorageOperation'
import { registerWorkSansFonts } from '../utils/registerFonts'

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

  // 2. 元画像のメタデータを取得
  const metadata = await sharp(imageBuffer).metadata()
  const originalWidth = metadata.width || 1200
  const originalHeight = metadata.height || 630

  console.log('[generateLgtmImage] Original image size:', {
    width: originalWidth,
    height: originalHeight,
  })

  // 3. 画像サイズを最大1200pxに制限（アスペクト比を保持）
  const MAX_SIZE = 1200
  const maxDimension = Math.max(originalWidth, originalHeight)
  let imageWidth = originalWidth
  let imageHeight = originalHeight

  if (maxDimension > MAX_SIZE) {
    const scale = MAX_SIZE / maxDimension
    imageWidth = Math.round(originalWidth * scale)
    imageHeight = Math.round(originalHeight * scale)

    console.log('[generateLgtmImage] Resizing image:', {
      originalWidth,
      originalHeight,
      newWidth: imageWidth,
      newHeight: imageHeight,
      scale,
    })
  }

  // 4. Canvasで薄い黒レイヤーを作成（リサイズ後のサイズ）
  const canvas = createCanvas(imageWidth, imageHeight)
  const ctx = canvas.getContext('2d')

  // 薄い黒レイヤー（画像全体に均一に）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
  ctx.fillRect(0, 0, imageWidth, imageHeight)

  const overlayBuffer = canvas.toBuffer('image/png')

  // 5. Canvasで「LGTM」テキストを描画（リサイズ後のサイズ）
  const textCanvas = createCanvas(imageWidth, imageHeight)
  const textCtx = textCanvas.getContext('2d')

  const mainText = 'LGTM'
  const horizontalPadding = 40 // 左右の余白
  const maxTextWidth = imageWidth - horizontalPadding * 2 // テキストの最大幅

  // 画像サイズに応じて初期フォントサイズを設定
  let baseFontSize = Math.min(imageWidth, imageHeight) * 0.3 // 画像の短辺の30%
  let mainLetterSpacing = baseFontSize * 0.16 // フォントサイズの16%

  // フォントを設定してテキスト幅を計測
  textCtx.font = `${baseFontSize}px "Work Sans Black"`
  textCtx.save()
  textCtx.scale(1.2, 1) // 水平方向に1.2倍に拡大（計測用）

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
  textCtx.lineWidth = baseFontSize * 0.05 // フォントサイズの5%
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'middle'
  textCtx.lineJoin = 'round'
  textCtx.miterLimit = 2

  // 縦長になるのを防ぐため、水平方向に1.2倍に拡大
  const mainTextYPosition = imageHeight / 2
  textCtx.save()
  textCtx.translate(imageWidth / 2, mainTextYPosition)
  textCtx.scale(1.2, 1)
  textCtx.translate(-imageWidth / 2, -mainTextYPosition)

  // letter spacingを適用して文字を個別に描画
  let mainCurrentX = imageWidth / 2 - mainTextWidth / 2

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
  const subFontSize = baseFontSize * 0.16 // メインフォントの16%
  const subText = 'Looks Good To Me'
  const subTextYPosition = imageHeight / 2 + baseFontSize * 0.6

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
  let subCurrentX = imageWidth / 2 - subTextWidth / 2

  subTextChars.forEach((char) => {
    const charWidth = textCtx.measureText(char).width
    textCtx.fillText(char, subCurrentX + charWidth / 2, subTextYPosition)
    subCurrentX += charWidth + adjustedSubLetterSpacing
  })

  const textBuffer = textCanvas.toBuffer('image/png')

  // 6. 元画像をリサイズしてからレイヤーを合成
  let resizedImageBuffer = imageBuffer
  if (maxDimension > MAX_SIZE) {
    resizedImageBuffer = await sharp(imageBuffer)
      .resize(imageWidth, imageHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()
  }

  const outputBuffer = await sharp(resizedImageBuffer)
    .composite([
      { input: overlayBuffer, top: 0, left: 0 }, // 半透明オーバーレイ
      { input: textBuffer, top: 0, left: 0 }, // LGTMテキスト
    ])
    .webp({ quality: 85 }) // WebP形式で出力（軽量化）
    .toBuffer()

  console.log('[generateLgtmImage] Image composition completed')

  // 7. Cloud Storageに保存
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

  // 2. 元画像のメタデータを取得
  const metadata = await sharp(imageBuffer).metadata()
  const originalWidth = metadata.width || 1200
  const originalHeight = metadata.height || 630

  console.log('[generateLgtmImage] Original image size:', {
    width: originalWidth,
    height: originalHeight,
  })

  // 3. 画像サイズを最大1200pxに制限（アスペクト比を保持）
  const MAX_SIZE = 1200
  const maxDimension = Math.max(originalWidth, originalHeight)
  let imageWidth = originalWidth
  let imageHeight = originalHeight

  if (maxDimension > MAX_SIZE) {
    const scale = MAX_SIZE / maxDimension
    imageWidth = Math.round(originalWidth * scale)
    imageHeight = Math.round(originalHeight * scale)

    console.log('[generateLgtmImage] Resizing image:', {
      originalWidth,
      originalHeight,
      newWidth: imageWidth,
      newHeight: imageHeight,
      scale,
    })
  }

  // 4. Canvasで薄い黒レイヤーを作成（リサイズ後のサイズ）
  const canvas = createCanvas(imageWidth, imageHeight)
  const ctx = canvas.getContext('2d')

  // 薄い黒レイヤー（画像全体に均一に）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.fillRect(0, 0, imageWidth, imageHeight)

  const overlayBuffer = canvas.toBuffer('image/png')

  // 5. Canvasで「LGTM」テキストを描画（リサイズ後のサイズ）
  const textCanvas = createCanvas(imageWidth, imageHeight)
  const textCtx = textCanvas.getContext('2d')

  const mainText = 'LGTM'
  const horizontalPadding = 40 // 左右の余白
  const maxTextWidth = imageWidth - horizontalPadding * 2 // テキストの最大幅

  // 画像サイズに応じて初期フォントサイズを設定
  let baseFontSize = Math.min(imageWidth, imageHeight) * 0.3 // 画像の短辺の30%
  let mainLetterSpacing = baseFontSize * 0.16 // フォントサイズの16%

  // フォントを設定してテキスト幅を計測
  textCtx.font = `${baseFontSize}px "Work Sans Black"`
  textCtx.save()
  textCtx.scale(1.2, 1) // 水平方向に1.2倍に拡大（計測用）

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
  textCtx.lineWidth = baseFontSize * 0.05 // フォントサイズの5%
  textCtx.textAlign = 'center'
  textCtx.textBaseline = 'middle'
  textCtx.lineJoin = 'round'
  textCtx.miterLimit = 2

  // 縦長になるのを防ぐため、水平方向に1.2倍に拡大
  const mainTextYPosition = imageHeight / 2
  textCtx.save()
  textCtx.translate(imageWidth / 2, mainTextYPosition)
  textCtx.scale(1.2, 1)
  textCtx.translate(-imageWidth / 2, -mainTextYPosition)

  // letter spacingを適用して文字を個別に描画
  let mainCurrentX = imageWidth / 2 - mainTextWidth / 2

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
  const subFontSize = baseFontSize * 0.16 // メインフォントの16%
  const subText = 'Looks Good To Me'
  const subTextYPosition = imageHeight / 2 + baseFontSize * 0.6

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
  let subCurrentX = imageWidth / 2 - subTextWidth / 2

  subTextChars.forEach((char) => {
    const charWidth = textCtx.measureText(char).width
    textCtx.fillText(char, subCurrentX + charWidth / 2, subTextYPosition)
    subCurrentX += charWidth + adjustedSubLetterSpacing
  })

  const textBuffer = textCanvas.toBuffer('image/png')

  // 6. 元画像をリサイズしてからレイヤーを合成
  let resizedImageBuffer = imageBuffer
  if (maxDimension > MAX_SIZE) {
    resizedImageBuffer = await sharp(imageBuffer)
      .resize(imageWidth, imageHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()
  }

  const outputBuffer = await sharp(resizedImageBuffer)
    .composite([
      { input: overlayBuffer, top: 0, left: 0 }, // 半透明オーバーレイ
      { input: textBuffer, top: 0, left: 0 }, // LGTMテキスト
    ])
    .webp({ quality: 85 })
    .toBuffer()

  console.log('[generateLgtmImage] Image composition completed')

  // 7. Cloud Storageに保存
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
