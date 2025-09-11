// generate-env.js
// Membaca .env dan menghasilkan env.js untuk dipakai di browser

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat .env di root project
dotenv.config({ path: path.join(__dirname, '.env') });

const requiredKeys = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

const missing = requiredKeys.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Variabel berikut belum diisi di .env: ${missing.join(', ')}`);
  process.exit(1);
}

const envObject = {
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
};

const out = `// env.js - dibangkitkan dari generate-env.js\nwindow.ENV = ${JSON.stringify(envObject, null, 2)};\n`;

fs.writeFileSync(path.join(__dirname, 'env.js'), out, 'utf8');
console.log('env.js berhasil dibuat.');


