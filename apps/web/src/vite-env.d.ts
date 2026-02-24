/// <reference types="vite/client" />

// Viteの環境変数の型定義を拡張
// biome-ignore lint/correctness/noUnusedVariables: Viteの型定義拡張のため必要
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_USE_EMULATOR?: string
}
