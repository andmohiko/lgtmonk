/**
 * LGTM画像生成APIのクライアント関数
 */

export type GenerateLgtmImageRequest = {
  imageUrl?: string // 外部URLから生成する場合
  base64Image?: string // Base64から生成する場合
  keyword: string // 検索キーワード
}

export type GenerateLgtmImageResponse = {
  imageUrl: string // 生成されたLGTM画像のURL
}

/**
 * 外部URLの画像からLGTM画像を生成
 */
export const generateLgtmImageFromUrl = async (
  imageUrl: string,
  keyword: string,
): Promise<string> => {
  const functionsUrl =
    import.meta.env.VITE_FIREBASE_FUNCTIONS_URL ||
    'https://asia-northeast1-lgtmonk.cloudfunctions.net/api'

  const response = await fetch(`${functionsUrl}/generateLgtmImage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl,
      keyword,
    } satisfies GenerateLgtmImageRequest),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'LGTM画像の生成に失敗しました')
  }

  const data: GenerateLgtmImageResponse = await response.json()
  return data.imageUrl
}

/**
 * アップロードした画像ファイルからLGTM画像を生成
 */
export const generateLgtmImageFromFile = async (
  file: File,
  keyword: string,
): Promise<string> => {
  // ファイルをBase64に変換
  const base64Image = await fileToBase64(file)

  const functionsUrl =
    import.meta.env.VITE_FIREBASE_FUNCTIONS_URL ||
    'https://asia-northeast1-lgtmonk.cloudfunctions.net/api'

  const response = await fetch(`${functionsUrl}/generateLgtmImage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64Image,
      keyword,
    } satisfies GenerateLgtmImageRequest),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'LGTM画像の生成に失敗しました')
  }

  const data: GenerateLgtmImageResponse = await response.json()
  return data.imageUrl
}

/**
 * FileオブジェクトをBase64文字列に変換
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
