import { existsSync } from 'node:fs'
import path from 'node:path'
import { GlobalFonts } from '@napi-rs/canvas'

/**
 * Work Sansフォントを@napi-rs/canvasに登録する
 * Cloud Functions環境でカスタムフォントを使用するために必要
 *
 * 注意: @napi-rs/canvasでは、各ウェイトを別のファミリー名で登録するか、
 * またはウェイト情報を含めて登録する必要があります。
 */
export const registerWorkSansFonts = (): void => {
  const fontsDir = path.join(__dirname, '../assets/fonts')

  console.log('[registerFonts] Fonts directory:', fontsDir)
  console.log('[registerFonts] Directory exists:', existsSync(fontsDir))

  try {
    const blackFontPath = path.join(fontsDir, 'WorkSans-Black.ttf')
    const regularFontPath = path.join(fontsDir, 'WorkSans-Regular.ttf')
    const lightFontPath = path.join(fontsDir, 'WorkSans-Light.ttf')
    const thinFontPath = path.join(fontsDir, 'WorkSans-Thin.ttf')

    console.log('[registerFonts] Black font exists:', existsSync(blackFontPath))
    console.log(
      '[registerFonts] Regular font exists:',
      existsSync(regularFontPath),
    )

    // Work Sans Black (900) - メインテキスト用
    GlobalFonts.registerFromPath(blackFontPath, 'Work Sans Black')

    // Work Sans Regular (400) - サブテキスト用
    GlobalFonts.registerFromPath(regularFontPath, 'Work Sans')

    // Work Sans Light (300)
    GlobalFonts.registerFromPath(lightFontPath, 'Work Sans Light')

    // Work Sans Thin (100)
    GlobalFonts.registerFromPath(thinFontPath, 'Work Sans Thin')

    // 登録されたフォント一覧を確認
    const registeredFonts = GlobalFonts.families
    console.log('[registerFonts] Registered font families:', registeredFonts)

    console.log('[registerFonts] Work Sans fonts registered successfully')
  } catch (error) {
    console.error('[registerFonts] Failed to register Work Sans fonts:', error)
    throw error
  }
}
