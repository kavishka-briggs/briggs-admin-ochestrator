import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import tailwindcss from '@tailwindcss/vite'
import { orchConfigPlugin } from './orchConfigPlugin'

export default defineConfig({
  plugins: [orchConfigPlugin(), react(), tailwindcss(), federation(
    {
      name: 'Orchestrator',
      remotes: {
        // Need the below to avoid sharescope error in deployment
        Remote: "",
      },
      shared: [
        "react",
        "react-dom",
        "react-router",
        "react-i18next"
      ]
    }
  )],
  server: {
    headers: {
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    headers: {
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  }
})
