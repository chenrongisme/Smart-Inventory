/**
 * Smart Inventory - Server Entry Point
 *
 * Security requirements:
 * - JWT_SECRET must be set via environment variable
 */

import { createApp } from './src/app';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function main() {
  if (!process.env.JWT_SECRET) {
    console.error('\n[FATAL] JWT_SECRET environment variable is not set!');
    console.error('Please set it before starting the server:');
    console.error('  JWT_SECRET=your-super-secret-key npm start\n');
    process.exit(1);
  }

  const app = await createApp();

  app.listen(PORT, '0.0.0.0', () => {
    const isProd = process.env.NODE_ENV === 'production';
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${isProd ? 'Production (serving static dist)' : 'Development (Vite Middleware)'}`);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
