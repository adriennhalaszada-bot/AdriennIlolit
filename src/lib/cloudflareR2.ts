// Cloudflare R2 Media Storage Client & Utility Helper for www.ilolit.com

export interface UploadResult {
  url: string;
  fallbackUrl?: string;
  key: string;
  mimeType: string;
  size: number;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToCloudflare(file: File): Promise<UploadResult> {
  const dataUrl = await fileToDataUrl(file);

  try {
    const res = await fetch("/api/upload/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, filename: file.name }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        url: data.url || dataUrl,
        fallbackUrl: data.url || dataUrl,
        key: data.key || `media-${Date.now()}`,
        mimeType: file.type || "image/jpeg",
        size: file.size,
      };
    }
  } catch (err) {
    console.warn("Cloudflare upload endpoint offline, using instant Base64 preview:", err);
  }

  return {
    url: dataUrl,
    key: `local-${Date.now()}-${file.name}`,
    mimeType: file.type || "image/jpeg",
    size: file.size,
  };
}

export async function uploadVideoToCloudflare(file: File): Promise<UploadResult> {
  const dataUrl = await fileToDataUrl(file);

  try {
    const res = await fetch("/api/upload/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video: dataUrl, filename: file.name }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        url: data.url || dataUrl,
        fallbackUrl: data.url || dataUrl,
        key: data.key || `video-${Date.now()}`,
        mimeType: file.type || "video/mp4",
        size: file.size,
      };
    }
  } catch (err) {
    console.warn("Cloudflare video upload endpoint offline, using instant Base64 preview:", err);
  }

  return {
    url: dataUrl,
    key: `local-video-${Date.now()}-${file.name}`,
    mimeType: file.type,
    size: file.size,
  };
}
