import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', ''); // carga el .env de la raíz del repo

  return {
    plugins: [react()],
    define: {
      'import.meta.env.MAPBOX_TOKEN': JSON.stringify(env.MAPBOX_TOKEN),
    },
  }
})
