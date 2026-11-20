import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — чтобы собранный сайт работал из любой подпапки хостинга
export default defineConfig({
  base: './',
  plugins: [react()],
});
