/**
 * ローカル環境かどうかを判定するカスタムフック
 * @returns ローカル環境の場合はtrue、それ以外はfalse
 */
export const useIsLocal = (): boolean => {
  // 環境変数でローカル判定
  const isLocalEnv = import.meta.env.VITE_ENV === 'local'

  // エミュレーター使用中の判定
  const isUsingEmulator = import.meta.env.VITE_USE_EMULATOR === 'true'

  // ホスト名でのローカル判定（フォールバック）
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')

  return isLocalEnv || isUsingEmulator || isLocalHost
}
