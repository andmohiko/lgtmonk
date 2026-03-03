import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: [
      't-1536140864---lgtmonk-d7ny3y5ita-de.a.run.app',
      'lgtm.mnhr.dev',
    ],
  },
  server: {
    host: true,
    allowedHosts: [
      't-1536140864---lgtmonk-d7ny3y5ita-de.a.run.app',
      'lgtm.mnhr.dev',
    ],
  },
})

export default config
