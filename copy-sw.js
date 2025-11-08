#!/usr/bin/env node
// Cross-platform script to copy service worker files after build
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  { src: 'public/sw.js', dest: 'dist/sw.js' },
  { src: 'public/firebase-messaging-sw.js', dest: 'dist/firebase-messaging-sw.js' }
];

files.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, src);
  const destPath = path.join(__dirname, dest);

  try {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ Copied ${src} to ${dest}`);
  } catch (err) {
    console.error(`✗ Failed to copy ${src}:`, err.message);
    process.exit(1);
  }
});

console.log('✓ Service worker files copied successfully');
