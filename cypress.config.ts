import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: true,
    videosFolder: 'demo/videos',
    videoCompression: 32,
    viewportWidth: 1280,
    viewportHeight: 768,
    defaultCommandTimeout: 10000,
  },
});
