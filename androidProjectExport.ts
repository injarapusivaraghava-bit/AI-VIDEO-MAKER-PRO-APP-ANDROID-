import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export interface AndroidProjectStatusPayload {
  ready: boolean;
  packageName: string;
  appName: string;
  capacitorConfig: boolean;
  androidManifest: boolean;
  gradleWrapper: boolean;
  githubWorkflow: boolean;
  webAssetsSynced: boolean;
  fileCount: number;
  exportUrl: string;
}

const ROOT_FILES = [
  'package.json',
  'bun.lock',
  'capacitor.config.json',
  'tsconfig.json',
  'vite.config.ts',
  'index.html',
  'server.ts',
  'androidProjectExport.ts',
  'metadata.json',
  'firebase-applet-config.json',
  'firebase-blueprint.json',
  'firestore.rules',
  'ANDROID_APK_GUIDE.md',
  '.env.example',
  '.gitignore',
  'eslint.config.js',
];

const INCLUDE_DIRS = ['.github', 'android', 'src', 'public'];

const SKIP_REL_PREFIXES = [
  'android/.gradle/',
  'android/build/',
  'android/app/build/',
  'android/local.properties',
  'public/downloads/',
  'node_modules/',
  'dist/',
  'data/',
  '.git/',
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function shouldSkipRelPath(relUnix: string): boolean {
  return SKIP_REL_PREFIXES.some(
    (prefix) => relUnix === prefix.replace(/\/$/, '') || relUnix.startsWith(prefix)
  );
}

function walkDirFiles(rootDir: string, dirRel: string, out: { relPath: string; absPath: string }[]) {
  const absDir = path.join(rootDir, dirRel);
  if (!fs.existsSync(absDir)) return;

  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.posix.join(dirRel.replace(/\\/g, '/'), entry.name);
    if (shouldSkipRelPath(rel)) continue;

    const abs = path.join(rootDir, rel);
    if (entry.isDirectory()) {
      walkDirFiles(rootDir, rel, out);
    } else if (entry.isFile()) {
      out.push({ relPath: rel, absPath: abs });
    }
  }
}

export function collectAndroidProjectFiles(rootDir: string): { relPath: string; absPath: string }[] {
  const files: { relPath: string; absPath: string }[] = [];

  for (const fileName of ROOT_FILES) {
    const abs = path.join(rootDir, fileName);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      files.push({ relPath: fileName, absPath: abs });
    }
  }

  for (const dir of INCLUDE_DIRS) {
    walkDirFiles(rootDir, dir, files);
  }

  return files;
}

export function getAndroidProjectStatus(rootDir: string): AndroidProjectStatusPayload {
  const capacitorConfig = fs.existsSync(path.join(rootDir, 'capacitor.config.json'));
  const androidManifest = fs.existsSync(
    path.join(rootDir, 'android/app/src/main/AndroidManifest.xml')
  );
  const gradleWrapper =
    fs.existsSync(path.join(rootDir, 'android/gradlew')) &&
    fs.existsSync(path.join(rootDir, 'android/gradle/wrapper/gradle-wrapper.jar'));
  const githubWorkflow =
    fs.existsSync(path.join(rootDir, '.github/workflows/android-build.yml')) ||
    fs.existsSync(path.join(rootDir, '.github/workflows/android-apk.yml'));
  const webAssetsSynced = fs.existsSync(
    path.join(rootDir, 'android/app/src/main/assets/public/index.html')
  );

  const files = collectAndroidProjectFiles(rootDir);

  return {
    ready: capacitorConfig && androidManifest && gradleWrapper && githubWorkflow,
    packageName: 'com.aivideomakerpro.app',
    appName: 'AI VIDEO MAKER PRO',
    capacitorConfig,
    androidManifest,
    gradleWrapper,
    githubWorkflow,
    webAssetsSynced,
    fileCount: files.length,
    exportUrl: '/api/android-project/export',
  };
}

export function buildAndroidProjectZip(rootDir: string): Buffer {
  const files = collectAndroidProjectFiles(rootDir);
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const file of files) {
    const raw = fs.readFileSync(file.absPath);
    const compressed = zlib.deflateRawSync(raw, { level: 6 });
    const useDeflate = compressed.length < raw.length;
    const payload = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);
    const nameBuf = Buffer.from(file.relPath, 'utf-8');

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, payload);

    const isExecutable = file.relPath === 'android/gradlew';
    const unixMode = isExecutable ? 0o100755 : 0o100644;
    const externalAttr = (unixMode << 16) >>> 0;

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x031e, 4); // Unix made by
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(externalAttr, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}
