import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Listen on all interfaces (IPv4 + IPv6) so 127.0.0.1 always works
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
});
