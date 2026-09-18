import { customFetch } from "@workspace/api-client-react";

export interface CloudflareMediaMetaData {
  id: string;
  url: string;
  type: "image" | "video";
  sizeBytes: number;
  isPrivate: boolean;
  uploadedAt: string;
}

export function getUserStorageQuota(userId?: string): { usedBytes: number; maxBytes: number; uploadsTodayCount: number } {
  return {
    usedBytes: 0,
    maxBytes: 1024 * 1024 * 1024,
    uploadsTodayCount: 0,
  };
}

export async function uploadToCloudflareMedia(
  file: File,
  userId?: string,
  isPrivate: boolean = false
): Promise<{ success: boolean; url: string; metadata?: CloudflareMediaMetaData; error?: string }> {
  try {
    const payload = await customFetch<{
      success: boolean;
      key: string;
      url: string;
      uploadedAt?: string;
    }>("/api/media/upload", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        "X-Media-Private": String(isPrivate),
      },
      body: file,
      responseType: "json",
    });

    if (!payload?.success || !payload.key || !payload.url) {
      return {
        success: false,
        url: "",
        error: "A Cloudflare nem adott vissza érvényes fájlazonosítót.",
      };
    }

    const metadata: CloudflareMediaMetaData = {
      id: payload.key,
      url: payload.url,
      type: file.type.startsWith("video/") ? "video" : "image",
      sizeBytes: file.size,
      isPrivate,
      uploadedAt: payload.uploadedAt || new Date().toISOString(),
    };

    return { success: true, url: payload.url, metadata };
  } catch {
    return {
      success: false,
      url: "",
      error: "A Cloudflare médiatár jelenleg nem érhető el. A fájl nem lett elmentve.",
    };
  }
}

export async function deleteCloudflareMedia(key: string, userId?: string): Promise<boolean> {
  try {
    await customFetch(`/api/media?key=${encodeURIComponent(key)}`, { method: "DELETE", responseType: "json" });
    return true;
  } catch {
    return false;
  }
}

export function getSignedMediaUrl(metadataOrUrl: any, userId?: string): string {
  if (typeof metadataOrUrl === "string") return metadataOrUrl;
  return metadataOrUrl?.url || "";
}
