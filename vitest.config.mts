import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // 각 테스트가 끝날 때마다 @testing-library가 정리하기 위해 필요합니다.
    // 설정하지 않으면 `Found multiple elements with ~` 오류가 발생합니다.
    globals: true,
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: ['**/*.d.ts'],
    reporters: ['html'],
    environment: 'jsdom',
  },
});
