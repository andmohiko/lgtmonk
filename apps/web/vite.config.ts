import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({
      server: {
        // Cloud Run uses PORT environment variable
        port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
        host: '0.0.0.0', // Listen on all network interfaces
      },
    }),
    viteReact(),
  ],
})

export default config
