const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('[Build Orchestrator] 1. Building Vite React frontend renderer...');
  execSync('npm run build --prefix src/renderer', { stdio: 'inherit' });

  console.log('[Build Orchestrator] 2. Obfuscating source files...');
  execSync('node scripts/obfuscate.js --obfuscate', { stdio: 'inherit' });

  console.log('[Build Orchestrator] 3. Running electron-builder...');
  execSync('npx electron-builder --config.publish=never', { stdio: 'inherit' });
} catch (err) {
  console.error('[Build Orchestrator] Compilation error occurred:', err.message);
  process.exitCode = 1;
} finally {
  console.log('[Build Orchestrator] 4. Running cleanup and restoring original source files...');
  try {
    execSync('node scripts/obfuscate.js --restore', { stdio: 'inherit' });
  } catch (restoreErr) {
    console.error('[Build Orchestrator] CRITICAL: Restore failed! Check the .obfuscation-backup directory.', restoreErr.message);
  }
}
