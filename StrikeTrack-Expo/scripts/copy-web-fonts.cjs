const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = process.cwd();
const sourceDir = path.join(
  projectRoot,
  'node_modules',
  '@expo',
  'vector-icons',
  'build',
  'vendor',
  'react-native-vector-icons',
  'Fonts'
);
const targetDir = path.join(
  projectRoot,
  'public',
  'assets',
  'node_modules',
  '@expo',
  'vector-icons',
  'build',
  'vendor',
  'react-native-vector-icons',
  'Fonts'
);

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Vector icon font source directory not found: ${sourceDir}`);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const file of fs.readdirSync(sourceDir)) {
  if (!file.toLowerCase().endsWith('.ttf')) continue;
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);
  const bytes = fs.readFileSync(sourcePath);
  const hash = crypto.createHash('md5').update(bytes).digest('hex');
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  const hashedTargetPath = path.join(targetDir, `${base}.${hash}${ext}`);

  fs.copyFileSync(sourcePath, targetPath);
  fs.copyFileSync(sourcePath, hashedTargetPath);
}

console.log('Copied vector icon fonts to public/assets for offline PWA use.');
