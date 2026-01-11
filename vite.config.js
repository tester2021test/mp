import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// REPLACE 'repo-name' WITH YOUR ACTUAL GITHUB REPOSITORY NAME
// Example: If your repo is [https://github.com/username/my-sec-app](https://github.com/username/my-sec-app), use '/my-sec-app/'
export default defineConfig({
  plugins: [react()],
  base: '/mp/', 
})

