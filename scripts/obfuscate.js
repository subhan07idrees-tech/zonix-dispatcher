const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const BACKUP_DIR = path.join(__dirname, '..', '.obfuscation-backup');
const TARGET_DIRS = [
  path.join(__dirname, '..', 'src', 'main'),
  path.join(__dirname, '..', 'src', 'preload'),
  path.join(__dirname, '..', 'src', 'renderer', 'dist')
];

// Security obfuscation settings tuned for Electron compatibility
const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: true,
  stringArrayCallsTransform: false,
  stringArrayEncoding: [],
  stringArrayThreshold: 0.5,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  reservedNames: [
    'require', 'exports', 'module', 'electron', 'electron-store', 
    'crypto-js', 'electron-updater', 'node-fetch', 'ws', 'ipcMain', 
    'ipcRenderer', 'contextBridge', 'app', 'BrowserWindow', 'session', 
    'safeStorage', 'path', 'fs', 'child_process', 'os'
  ]
};

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      if (filePath.endsWith('.js') && !filePath.endsWith('.map')) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

function obfuscate() {
  console.log('[Obfuscation] Starting source code obfuscation...');
  
  if (fs.existsSync(BACKUP_DIR)) {
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const rootDir = path.join(__dirname, '..');

  TARGET_DIRS.forEach((dir) => {
    const files = getAllFiles(dir);
    files.forEach((file) => {
      const relativePath = path.relative(rootDir, file);
      const backupPath = path.join(BACKUP_DIR, relativePath);
      
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(file, backupPath);
      console.log(`[Backup] Saved original: ${relativePath}`);

      const code = fs.readFileSync(file, 'utf8');
      try {
        const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
        fs.writeFileSync(file, obfuscatedResult.getObfuscatedCode(), 'utf8');
        console.log(`[Obfuscate] Scrambled: ${relativePath}`);
      } catch (err) {
        console.error(`[Obfuscation] Failed on file: ${file}`, err);
        restore();
        process.exit(1);
      }
    });
  });
  console.log('[Obfuscation] Complete! Source files successfully mangled.');
}

function restore() {
  console.log('[Obfuscation] Restoring original source code files...');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('[Obfuscation] No backup found. Nothing to restore.');
    return;
  }

  const rootDir = path.join(__dirname, '..');
  const backupFiles = getAllFiles(BACKUP_DIR);

  backupFiles.forEach((backupFile) => {
    const relativePath = path.relative(BACKUP_DIR, backupFile);
    const originalPath = path.join(rootDir, relativePath);
    
    if (fs.existsSync(originalPath)) {
      fs.copyFileSync(backupFile, originalPath);
      console.log(`[Restore] Restored: ${relativePath}`);
    }
  });

  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  console.log('[Obfuscation] Backup successfully restored and cleaned up.');
}

const mode = process.argv[2];
if (mode === '--obfuscate') {
  obfuscate();
} else if (mode === '--restore') {
  restore();
} else {
  console.log('Usage: node scripts/obfuscate.js [--obfuscate | --restore]');
}
