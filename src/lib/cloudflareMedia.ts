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
    usedBytes: 15 * 1024 * 1024,
    maxBytes: 500 * 1024 * 1024,
    uploadsTodayCount: 3,
  };
}

export async function uploadToCloudflareMedia(
  file: File,
  userId?: string,
  isPrivate: boolean = false
): Promise<{ success: boolean; url: string; metadata?: CloudflareMediaMetaData; error?: string }> {
  const isVideo = file.type.startsWith("video/");
  const uniqueId = `cf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Read actual user uploaded file into Data URL
  const fileUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        resolve(URL.createObjectURL(file));
      }
    };
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });

  const metadata: CloudflareMediaMetaData = {
    id: uniqueId,
    url: fileUrl,
    type: isVideo ? "video" : "image",
    sizeBytes: file.size,
    isPrivate,
    uploadedAt: new Date().toISOString(),
  };

  return { success: true, url: fileUrl, metadata };
}

export async function deleteCloudflareMedia(url: string, userId?: string): Promise<boolean> {
  return true;
}

export function getSignedMediaUrl(metadataOrUrl: any, userId?: string): string {
  if (typeof metadataOrUrl === "string") return metadataOrUrl;
  return metadataOrUrl?.url || "";
}
