import { defineConfig } from 'tsup'
import { cpSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  target: 'node18',
  format: ['cjs'],
  sourcemap: true,
  dts: false, // Firebase deploy では型定義は不要
  external: ['firebase-functions', 'firebase-admin'], // Cloud Functions が持つ依存
  clean: true,
  shims: true, // Node.js のグローバルAPI shimを使う場合
  esbuildOptions(options) {
    options.alias = {
      '@lgtmonk/common': '../../packages/common/src',
    }
  },
  // ビルド後にフォントファイルをコピー
  onSuccess: async () => {
    const srcFonts = resolve(__dirname, 'src/assets/fonts')
    const destFonts = resolve(__dirname, 'lib/assets/fonts')
    cpSync(srcFonts, destFonts, { recursive: true })
    console.log('✓ Fonts copied to lib/assets/fonts')
  },
})
