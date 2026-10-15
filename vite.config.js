import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup/index.html'),
                options: resolve(__dirname, 'src/options/options.html'),
                content: resolve(__dirname, 'src/content/content.ts'),
                background: resolve(__dirname, 'src/background/service-worker.ts'),
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === 'content')
                        return 'content.js';
                    if (chunkInfo.name === 'background')
                        return 'background.js';
                    return 'assets/[name]-[hash].js';
                },
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },
        },
    },
    test: {
        globals: true,
        environment: 'node',
    },
});
