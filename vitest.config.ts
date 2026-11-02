import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    exclude: ['**/node_modules/**', '**/phase5Tactics.test.ts', '**/phase7BallFlight.test.ts', '**/phase8DribblingGinga.test.ts', '**/phase9AerialAnticipation.test.ts', '**/phase10PlayerRatings.test.ts', '**/phase11DynamicStadiums.test.ts', '**/hotfix*.test.ts'],
  },
});
