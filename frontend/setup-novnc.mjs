import { mkdirSync, cpSync, existsSync } from 'fs';
import { join } from 'path';

const src = join(
  process.cwd(),
  'node_modules',
  '@novnc',
  'novnc',
  'lib'   //  FIXED (not core)
);

const dest = join(process.cwd(), 'public', 'novnc');

console.log("Checking:", src);

if (!existsSync(src)) {
  console.error(' noVNC library not found.');
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log(' noVNC files copied to public/novnc/');
console.log(' Available at /novnc/rfb.js');