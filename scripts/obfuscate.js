const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const BACKUP_DIR = path.join(__dirname, '..', '.obfuscation-backup');
const TARGET_DIRS = [
  path.join(__dirname, '..', 'src', 'main'),
  path.join(__dirname, '..', 'src', 'preload'),
  path.join(__dirname, '..', 'src', 'renderer', 'dist')
];

// Security obfuscation settings
const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false, // Keep false for IPC/module compatibility
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['base64'],
  stringArrayIndexesType: ['hexadecimal-number'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
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
    console.log('[Obfuscation] Backup already exists. Please run restore first or delete .obfuscation-backup.');
    process.exit(1);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const rootDir = path.join(__dirname, '..');

  TARGET_DIRS.forEach((dir) => {
    const files = getAllFiles(dir);
    files.forEach((file) => {
      // Calculate relative path to construct backup path
      const relativePath = path.relative(rootDir, file);
      const backupPath = path.join(BACKUP_DIR, relativePath);
      
      // Ensure backup subdirectory exists
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      
      // Backup original file
      fs.copyFileSync(file, backupPath);
      console.log(`[Backup] Saved original: ${relativePath}`);

      // Read, obfuscate, and overwrite
      const code = fs.readFileSync(file, 'utf8');
      try {
        const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
        fs.writeFileSync(file, obfuscatedResult.getObfuscatedCode(), 'utf8');
        console.log(`[Obfuscate] Scrambled: ${relativePath}`);
      } catch (err) {
        console.error(`[Obfuscation] Failed on file: ${file}`, err);
        restore(); // Rollback if something breaks
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

  // Recursive delete backup folder
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  console.log('[Obfuscation] Backup successfully restored and cleaned up.');
}

// CLI handler
const mode = process.argv[2];
if (mode === '--obfuscate') {
  obfuscate();
} else if (mode === '--restore') {
  restore();
} else {
  console.log('Usage: node scripts/obfuscate.js [--obfuscate | --restore]');
}
