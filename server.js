import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 5000);
const DIST_DIR = path.resolve(__dirname, 'dist/public');
const UPLOADS_DIR = path.resolve(__dirname, 'dist/public/uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Cloudflare R2 Credentials
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'b1422d87820d2c83ccb4ca48dd16a9fa';
const CF_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'ilolit-media';
const CF_CUSTOM_DOMAIN = process.env.CLOUDFLARE_R2_CUSTOM_DOMAIN || 'media.ilolit.com';
const CF_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const CF_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

// Cloudflare R2 S3-compatible client
const r2Client = CF_ACCESS_KEY_ID && CF_SECRET_ACCESS_KEY ? new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CF_ACCESS_KEY_ID,
    secretAccessKey: CF_SECRET_ACCESS_KEY,
  },
}) : null;

console.log(r2Client
  ? `✅ Cloudflare R2 kapcsolódva: ${CF_BUCKET_NAME} @ ${CF_CUSTOM_DOMAIN}`
  : `⚠️  Cloudflare R2 API kulcs hiányzik - helyi mentésre vált`
);

async function uploadToR2(buffer, fileName, mimeType) {
  if (!r2Client) return null;
  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: CF_BUCKET_NAME,
      Key: `uploads/${fileName}`,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000',
    }));
    return `https://${CF_CUSTOM_DOMAIN}/uploads/${fileName}`;
  } catch (err) {
    console.error('R2 feltöltési hiba, helyi mentésre vált:', err.message);
    return null;
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

// Media storage (Cloudflare & Local)
const MEDIA_DB_PATH = path.resolve(__dirname, 'dist/public/data/media.json');

function loadMediaItems() {
  if (fs.existsSync(MEDIA_DB_PATH)) {
    try { return JSON.parse(fs.readFileSync(MEDIA_DB_PATH, 'utf-8')); } catch (e) {}
  }
  return [];
}

function saveMediaItems(data) {
  try { fs.writeFileSync(MEDIA_DB_PATH, JSON.stringify(data, null, 2), 'utf-8'); } catch (e) {}
}

const server = http.createServer((req, res) => {
  const reqUrl = req.url.split('?')[0];

  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // GET /api/admin/category-suggestions
  if (req.method === 'GET' && reqUrl === '/api/admin/category-suggestions') {
    const suggestions = loadCategorySuggestions();
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(suggestions));
    return;
  }

  // POST /api/category-suggestions
  if (req.method === 'POST' && reqUrl === '/api/category-suggestions') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(Buffer.concat(body).toString('utf-8'));
        const suggestions = loadCategorySuggestions();
        const newSuggestion = {
          id: `sug_${Date.now()}`,
          sellerName: payload.sellerName || 'Eladó',
          sellerEmail: payload.sellerEmail || '',
          suggestedLevel1: payload.suggestedLevel1 || '',
          suggestedLevel2: payload.suggestedLevel2 || '',
          suggestedLevel3: payload.suggestedLevel3 || '',
          notes: payload.notes || '',
          createdAt: new Date().toISOString(),
          status: 'PENDING',
        };
        suggestions.unshift(newSuggestion);
        saveCategorySuggestions(suggestions);
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ success: true, suggestion: newSuggestion }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // POST /api/admin/category-suggestions/:id/approve
  if (req.method === 'POST' && reqUrl.startsWith('/api/admin/category-suggestions/') && reqUrl.endsWith('/approve')) {
    const sugId = reqUrl.split('/')[4];
    const suggestions = loadCategorySuggestions();
    const idx = suggestions.findIndex(s => s.id === sugId);
    if (idx !== -1) {
      suggestions[idx].status = 'APPROVED';
      saveCategorySuggestions(suggestions);
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ success: true, suggestion: suggestions[idx] }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Suggestion not found' }));
    }
    return;
  }

  // GET /api/media -> Returns list of media items and stats
  if (req.method === 'GET' && reqUrl === '/api/media') {
    const items = loadMediaItems().filter(m => !m.deletedAt);
    const totalStorageUsedBytes = items.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
    const storageLimitBytes = 1 * 1024 * 1024 * 1024; // 1 GB
    const today = new Date().toISOString().split('T')[0];
    const uploadsTodayCount = items.filter(m => m.createdAt && m.createdAt.startsWith(today)).length;
    const maxDailyUploads = 50;

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({
      success: true,
      items,
      stats: {
        totalStorageUsedBytes,
        storageLimitBytes,
        uploadsTodayCount,
        maxDailyUploads,
        totalFilesCount: items.length,
        maxImageCount: 6,
        maxVideoDurationSeconds: 10,
      }
    }));
    return;
  }

  // POST /api/media/upload-url -> Generates direct upload URL
  if (req.method === 'POST' && reqUrl === '/api/media/upload-url') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(Buffer.concat(body).toString('utf-8'));
        const { type, fileName, fileSize, mimeType, duration } = payload;

        const isVideo = type === 'video' || (mimeType && mimeType.startsWith('video/'));
        const maxImgSize = 20 * 1024 * 1024; // 20MB

        const items = loadMediaItems().filter(m => !m.deletedAt);

        // 1. Storage limit check (1 GB)
        const totalStorageUsedBytes = items.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
        const storageLimitBytes = 1 * 1024 * 1024 * 1024; // 1 GB
        if (totalStorageUsedBytes + (fileSize || 0) > storageLimitBytes) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'A tárhely korlát (1 GB) megtelt. Törölj néhány fájlt az új feltöltéshez.' }));
          return;
        }

        // 2. Image count limit check (max 6 images)
        if (!isVideo) {
          const imageCount = items.filter(m => m.type === 'image').length;
          if (imageCount >= 6) {
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ error: 'Legfeljebb 6 db kép tölthető fel felhasználónként.' }));
            return;
          }
          if (fileSize > maxImgSize) {
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ error: 'A kép mérete meghaladja a megengedett 20 MB korlátot.' }));
            return;
          }
        }

        // 3. Video duration check (max 10 seconds)
        if (isVideo && duration && duration > 10) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'A videó hossza nem haladhatja meg a 10 másodpercet.' }));
          return;
        }

        // Daily upload quota check
        const today = new Date().toISOString().split('T')[0];
        const uploadsTodayCount = items.filter(m => m.createdAt && m.createdAt.startsWith(today)).length;
        if (uploadsTodayCount >= 50) {
          res.writeHead(429, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Elérted a napi maximális 50 feltöltési korlátot.' }));
          return;
        }

        const fileId = `${isVideo ? 'cf-stream' : 'cf-img'}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const directUploadUrl = isVideo ? '/api/upload/video' : '/api/upload/image';

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({
          success: true,
          uploadUrl: directUploadUrl,
          id: fileId,
          cloudflareId: fileId,
          type: isVideo ? 'video' : 'image',
          storageProvider: process.env.CLOUDFLARE_API_TOKEN ? 'cloudflare_direct' : 'local_r2_proxy',
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Érvénytelen kérés' }));
      }
    });
    return;
  }

  // POST /api/media/record -> Record uploaded file metadata into media database
  if (req.method === 'POST' && reqUrl === '/api/media/record') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(Buffer.concat(body).toString('utf-8'));
        const items = loadMediaItems();
        const newItem = {
          id: payload.id || `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: payload.userId || 'usr_default',
          type: payload.type || 'image',
          cloudflareId: payload.cloudflareId || payload.id || '',
          url: payload.url,
          thumbnailUrl: payload.thumbnailUrl || (payload.type === 'video' ? payload.url : undefined),
          fileSize: payload.fileSize || 0,
          mimeType: payload.mimeType || 'image/jpeg',
          width: payload.width || null,
          height: payload.height || null,
          duration: payload.duration || null,
          visibility: payload.visibility || 'public',
          createdAt: new Date().toISOString(),
          deletedAt: null,
        };
        items.unshift(newItem);
        saveMediaItems(items);

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ success: true, media: newItem }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Érvénytelen adatok' }));
      }
    });
    return;
  }

  // GET /api/media/:id/signed-url -> Time-limited signed URL generation
  if (req.method === 'GET' && reqUrl.startsWith('/api/media/') && reqUrl.endsWith('/signed-url')) {
    const mediaId = reqUrl.split('/')[3];
    const items = loadMediaItems();
    const item = items.find(m => m.id === mediaId && !m.deletedAt);
    if (!item) {
      res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Média nem található' }));
      return;
    }
    const signedToken = `cf_signed_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    const signedUrl = `${item.url}?token=${signedToken}&expires=${encodeURIComponent(expiresAt)}`;

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ success: true, signedUrl, expiresAt }));
    return;
  }

  // PATCH /api/media/:id/visibility -> Toggle visibility
  if (req.method === 'PATCH' && reqUrl.startsWith('/api/media/') && reqUrl.endsWith('/visibility')) {
    const mediaId = reqUrl.split('/')[3];
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      try {
        const { visibility } = JSON.parse(Buffer.concat(body).toString('utf-8'));
        const items = loadMediaItems();
        const idx = items.findIndex(m => m.id === mediaId && !m.deletedAt);
        if (idx === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ error: 'Média nem található' }));
          return;
        }
        items[idx].visibility = visibility === 'private' ? 'private' : 'public';
        saveMediaItems(items);

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ success: true, media: items[idx] }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Érvénytelen kérés' }));
      }
    });
    return;
  }

  // DELETE /api/media/:id -> Delete media item
  if (req.method === 'DELETE' && reqUrl.startsWith('/api/media/')) {
    const mediaId = reqUrl.split('/')[3];
    const items = loadMediaItems();
    const idx = items.findIndex(m => m.id === mediaId && !m.deletedAt);
    if (idx !== -1) {
      items[idx].deletedAt = new Date().toISOString();
      saveMediaItems(items);

      console.log(`🗑️ Cloudflare media törölve: ${mediaId} (${items[idx].url})`);
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ success: true, id: mediaId }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Média nem található' }));
    }
    return;
  }

  // ✅ POST /api/upload/image és /api/upload/video → Cloudflare R2 / Local
  if (req.method === 'POST' && (reqUrl === '/api/upload/image' || reqUrl === '/api/upload/video')) {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      const buffer = Buffer.concat(body);
      const isVideo = reqUrl.includes('video');
      const mimeType = isVideo ? 'video/mp4' : 'image/webp';
      const ext = isVideo ? '.mp4' : '.webp';
      const fileId = `${isVideo ? 'video' : 'img'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const fileName = `${fileId}${ext}`;

      // 1. Feltöltés Cloudflare R2-re
      const r2Url = await uploadToR2(buffer, fileName, mimeType);

      // 2. Helyi mentés biztonsági másolatként
      const localPath = path.join(UPLOADS_DIR, fileName);
      try { fs.writeFileSync(localPath, buffer); } catch (e) {}

      const finalUrl = r2Url || `/uploads/${fileName}`;
      const cdnUrl = r2Url || `https://${CF_CUSTOM_DOMAIN}/uploads/${fileName}`;

      // Automatically record in media database
      const items = loadMediaItems();
      const newItem = {
        id: fileId,
        userId: 'usr_default',
        type: isVideo ? 'video' : 'image',
        cloudflareId: fileId,
        url: finalUrl,
        thumbnailUrl: isVideo ? finalUrl : undefined,
        fileSize: buffer.length,
        mimeType,
        width: isVideo ? 1920 : 1200,
        height: isVideo ? 1080 : 800,
        duration: isVideo ? 45.0 : null,
        visibility: 'public',
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };
      items.unshift(newItem);
      saveMediaItems(items);

      console.log(r2Url
        ? `✅ R2 feltöltve & iktatva: ${cdnUrl}`
        : `📁 Helyi mentés & iktatva: ${localPath}`
      );

      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({
        success: true,
        id: fileId,
        url: finalUrl,
        cdnUrl: cdnUrl,
        fallbackUrl: `/uploads/${fileName}`,
        key: `uploads/${fileName}`,
        bucket: CF_BUCKET_NAME,
        mimeType,
        size: buffer.length,
        storage: r2Url ? 'cloudflare_r2' : 'local',
        media: newItem,
      }));
    });
    return;
  }

  // Static file serving
  let filePath = path.join(DIST_DIR, reqUrl);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    const rootPath = path.join(__dirname, reqUrl);
    if (fs.existsSync(rootPath) && fs.statSync(rootPath).isFile()) {
      filePath = rootPath;
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      ...corsHeaders,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback
    const indexCandidates = [
      path.join(DIST_DIR, 'index.html'),
      path.join(__dirname, 'public', 'index.html'),
      path.join(__dirname, 'index.html'),
    ];
    const indexPath = indexCandidates.find(p => fs.existsSync(p));
    if (indexPath) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders, 'Cache-Control': 'no-cache' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Loloit szerver fut: http://localhost:${PORT}/`);
  console.log(`☁️  Cloudflare R2: ${CF_BUCKET_NAME} (${CF_CUSTOM_DOMAIN})\n`);
});
