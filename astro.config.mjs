// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  build: {
    // Always inline stylesheets to eliminate render-blocking CSS requests
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      // Increase inline limit for assets
      assetsInlineLimit: 51200, // 50KB
      cssCodeSplit: false, // Keep CSS together for better inlining
    }
  }
});
