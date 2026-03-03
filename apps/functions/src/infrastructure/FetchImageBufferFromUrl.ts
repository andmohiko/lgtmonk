import axios from 'axios'

/**
 * 外部URLから画像をBufferとして取得する
 * @param url - 画像のURL
 * @returns 画像のBuffer
 */
export const fetchImageBufferFromUrl = async (url: string): Promise<Buffer> => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 10000, // 10秒でタイムアウト
  })
  return Buffer.from(response.data, 'binary')
}
