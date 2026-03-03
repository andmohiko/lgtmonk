import { storageBucket } from '../lib/firebase'

export type FileData = {
  fileName: string
  type: string
  data: Buffer
}

/**
 * Cloud StorageにBufferを保存し、公開URLを返す
 * @param file - 保存するファイルデータ
 * @param storagePath - 保存先のパス（例: "lgtm-images"）
 * @returns 公開URL
 */
export const saveBufferToStorageOperation = async (
  file: FileData,
  storagePath: string,
): Promise<string> => {
  const fileRef = storageBucket.file(`${storagePath}/${file.fileName}`)

  // ファイルを保存
  await fileRef.save(file.data, {
    contentType: file.type,
    metadata: {
      cacheControl: 'public, max-age=31536000', // 1年間キャッシュ
    },
  })

  // エミュレーター環境ではmakePublicを呼ばない
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true'
  if (!isEmulator) {
    // ファイルを公開設定にする
    await fileRef.makePublic()
  }

  // 公開URLを返す
  // エミュレーターの場合は localhost の URL を返す
  if (isEmulator) {
    const bucket = storageBucket.name
    return `http://localhost:9199/v0/b/${bucket}/o/${encodeURIComponent(`${storagePath}/${file.fileName}`)}?alt=media`
  }

  return fileRef.publicUrl()
}
