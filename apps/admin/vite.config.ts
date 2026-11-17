import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const apiProxyTarget = loadEnv(mode, '.', 'VITE_API_').VITE_API_PROXY_TARGET;
  return {
    plugins: [react()],
    server: {
      port: 3001,
      host: '127.0.0.1',
      strictPort: true,
      proxy: apiProxyTarget ? { '/api': { target: apiProxyTarget, changeOrigin: true } } : undefined,
    },
  };
});
