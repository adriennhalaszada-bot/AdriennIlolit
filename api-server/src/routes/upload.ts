import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const CF_ACCOUNT_ID = process.env["CF_ACCOUNT_ID"];
const CF_R2_ACCESS_KEY_ID = process.env["CF_R2_ACCESS_KEY_ID"];
const CF_R2_SECRET_ACCESS_KEY = process.env["CF_R2_SECRET_ACCESS_KEY"];
const CF_R2_BUCKET = process.env["CF_R2_BUCKET"] || "loloit-images";
const CF_R2_PUBLIC_URL = process.env["CF_R2_PUBLIC_URL"];

function getR2Client() {
  if (!CF_ACCOUNT_ID || !CF_R2_ACCESS_KEY_ID || !CF_R2_SECRET_ACCESS_KEY) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: CF_R2_ACCESS_KEY_ID,
      secretAccessKey: CF_R2_SECRET_ACCESS_KEY,
    },
  });
}

import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "public", "uploads");

router.post("/upload/presign", async (req, res) => {
  const { filename, contentType, folder } = req.body as { filename?: string; contentType?: string; folder?: string };

  const r2 = getR2Client();
  if (r2 && CF_R2_PUBLIC_URL && filename && contentType) {
    const allowedFolders = new Set(["listings", "beauty"]);
    const safeFolder = folder && allowedFolders.has(folder) ? folder : "listings";
    const ext = filename.split(".").pop() ?? "jpg";
    const key = `${safeFolder}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: CF_R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    try {
      const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
      const publicUrl = `${CF_R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
      res.json({ url: publicUrl, uploadUrl });
      return;
    } catch (e) {
      // Fall through to local upload handler
    }
  }

  // Local fallback endpoint when R2 is offline or not configured
  const ext = filename ? (filename.split(".").pop() || "jpg") : "jpg";
  const fileId = `${randomUUID()}.${ext}`;
  res.json({
    url: `/uploads/${fileId}`,
    uploadUrl: `/api/upload/image?id=${fileId}`,
    fallback: true,
  });
});

// Direct Image Upload Handler (Base64 JSON, raw body, or dataUrl)
router.post("/upload/image", async (req, res) => {
  try {
    const { image, file, dataUrl, filename } = req.body || {};
    const targetPayload = image || file || dataUrl || (typeof req.body === "string" ? req.body : null);
    const queryId = req.query.id as string | undefined;

    if (targetPayload && typeof targetPayload === "string" && targetPayload.startsWith("data:")) {
      const matches = targetPayload.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        const fileId = queryId || `${randomUUID()}.${ext}`;
        const filePath = path.join(uploadsDir, fileId);
        const buffer = Buffer.from(matches[2], "base64");

        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        await fs.promises.writeFile(filePath, buffer);

        res.json({
          url: `/uploads/${fileId}`,
          key: fileId,
          success: true,
        });
        return;
      }
    }

    // Return Data URL or static URL if payload already is a Data URL or link
    if (targetPayload) {
      res.json({
        url: targetPayload,
        key: `img_${Date.now()}`,
        success: true,
      });
      return;
    }

    res.json({
      url: `/uploads/default.jpg`,
      key: `img_${Date.now()}`,
      success: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Fájl mentése nem sikerült: " + (err.message || "Ismeretlen hiba") });
  }
});

// Direct Video Upload Handler
router.post("/upload/video", async (req, res) => {
  try {
    const { video, file, dataUrl } = req.body || {};
    const targetPayload = video || file || dataUrl;

    if (targetPayload && typeof targetPayload === "string" && targetPayload.startsWith("data:")) {
      const matches = targetPayload.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const fileId = `${randomUUID()}.mp4`;
        const filePath = path.join(uploadsDir, fileId);
        const buffer = Buffer.from(matches[2], "base64");

        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        await fs.promises.writeFile(filePath, buffer);

        res.json({
          url: `/uploads/${fileId}`,
          key: fileId,
          success: true,
        });
        return;
      }
    }

    if (targetPayload) {
      res.json({
        url: targetPayload,
        key: `video_${Date.now()}`,
        success: true,
      });
      return;
    }

    res.json({
      url: `/uploads/default.mp4`,
      key: `video_${Date.now()}`,
      success: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Videó mentése nem sikerült" });
  }
});

// Cloudflare Direct Upload URL Helper
router.post("/media/upload-url", async (req, res) => {
  const id = `media_${Date.now()}_${randomUUID().slice(0, 6)}`;
  res.json({
    id,
    uploadUrl: "/api/upload/image",
  });
});

export default router;
