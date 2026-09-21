import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use @ as a stable alias for imports from the frontend source directory.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
