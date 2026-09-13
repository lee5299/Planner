import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{outDir:'dist/client',rollupOptions:{output:{manualChunks:{supabase:['@supabase/supabase-js']}}}},server:{host:'127.0.0.1'},preview:{host:'0.0.0.0',port:3000}});
