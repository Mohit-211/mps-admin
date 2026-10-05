import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [react(), tailwindcss()],
		server: {
			// localhost:3000 is in the live API's ACCESSDOMAINS.
			port: 3000,
			strictPort: true,
			// Only used when VITE_API_BASE_URL is the relative "/api/v1" (a local backend).
			proxy: {
				'/api': {
					target: env.VITE_BACKEND_URL || 'http://localhost:5000',
					changeOrigin: true,
				},
			},
		},
	};
});
