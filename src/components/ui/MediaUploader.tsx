import { useState, useRef, useEffect } from "react";
import { X, Image as ImageIcon, Loader2, Plus, Upload, ShieldCheck, Lock, Globe, HardDrive, AlertCircle, Trash2 } from "lucide-react";
import {
  uploadToCloudflareMedia,
  deleteCloudflareMedia,
  getUserStorageQuota,
  getSignedMediaUrl,
  type CloudflareMediaMetaData
} from "@/lib/cloudflareMedia";
import { useUserAccountStore } from "@/lib/userAccountStore";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface MediaUploaderProps {
  mediaUrls: string[];
  onChange: (urls: string[], metadataList?: CloudflareMediaMetaData[]) => void;
  maxFiles?: number;
  acceptVideo?: boolean;
  isPrivateDefault?: boolean;
}

export function MediaUploader({
  mediaUrls = [],
  onChange,
  maxFiles = 8,
  acceptVideo = false,
  isPrivateDefault = false
}: MediaUploaderProps) {
  const { toast } = useToast();
  const { currentUser } = useUserAccountStore();
  const userId = currentUser?.id || "guest-user";

  const [isUploading, setIsUploading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(isPrivateDefault);
  const [mediaItems, setMediaItems] = useState<CloudflareMediaMetaData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quota = getUserStorageQuota(userId);
  const usedMB = (quota.usedBytes / (1024 * 1024)).toFixed(1);
  const quotaPercent = Math.min(100, Math.round((quota.usedBytes / quota.maxBytes) * 100));

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsUploading(true);
    const newUrls = [...mediaUrls];
    const newMetadata = [...mediaItems];

    for (const file of files) {
      if (newUrls.length >= maxFiles) {
        toast({
          title: "Fájl limit elérve",
          description: `Egy alkalommal legfejlebb ${maxFiles} fájl tölthető fel!`,
          variant: "destructive"
        });
        break;
      }

      // Upload to Cloudflare direct upload handler
      const res = await uploadToCloudflareMedia(file, userId, isPrivate);

      if (!res.success || !res.metadata) {
        toast({
          title: "Feltöltési Hiba",
          description: res.error || "Nem sikerült a feltöltés!",
          variant: "destructive"
        });
        continue;
      }

      // Generate signed URL if private
      const finalUrl = getSignedMediaUrl(res.metadata, userId);
      newUrls.push(finalUrl);
      newMetadata.push(res.metadata);

      toast({
        title: "✓ Média Sikeresen Feltöltve!",
        description: `${res.metadata.type === "video" ? "🎥 Videó" : "📸 Kép"} elmentve a biztonságos médiatárba (${(file.size / (1024 * 1024)).toFixed(1)} MB).`
      });
    }

    setMediaItems(newMetadata);
    onChange(newUrls, newMetadata);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemove = async (index: number) => {
    const targetMeta = mediaItems[index];
    if (targetMeta) {
      await deleteCloudflareMedia(targetMeta.id, userId);
    }

    const updatedUrls = mediaUrls.filter((_, i) => i !== index);
    const updatedMeta = mediaItems.filter((_, i) => i !== index);

    setMediaItems(updatedMeta);
    onChange(updatedUrls, updatedMeta);

    toast({ title: "🗑️ Média Törölve!", description: "A fájl és metaadatai törölve lettek a médiatárolóból." });
  };

  return (
    <div className="space-y-4 bg-background p-4 rounded-3xl border shadow-xs">
      {/* Header & Storage Quota Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-extrabold">
          <span className="flex items-center gap-1.5 text-foreground">
            <ImageIcon className="w-4 h-4 text-violet-600" />
            {acceptVideo
              ? "📸 Képek (Max 20 MB) & 🎥 Videók (Max 100 MB / 3 perc)"
              : "📸 Portfólió & Referencia Képek (Max 20 MB)"}
          </span>
          <span className="text-violet-600 font-black">
            {mediaUrls.length} / {maxFiles} média feltöltve
          </span>
        </div>

        {/* User Quota Status Bar */}
        <div className="p-2.5 bg-muted/40 rounded-2xl border space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between font-bold text-muted-foreground">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-violet-600" />
              Saját Tárhely: <strong>{usedMB} MB / 1000 MB (1 GB)</strong>
            </span>
            <span>Napi feltöltések: <strong>{quota.uploadsTodayCount} / 50 fájl</strong></span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${quotaPercent > 80 ? "bg-rose-500" : "bg-violet-600"}`}
              style={{ width: `${Math.max(3, quotaPercent)}%` }}
            />
          </div>
        </div>

        {/* Privacy Setting Toggle (Section 2.4) */}
        <div className="flex items-center justify-between p-2.5 bg-violet-500/10 border border-violet-500/30 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            {isPrivate ? <Lock className="w-4 h-4 text-amber-600" /> : <Globe className="w-4 h-4 text-emerald-600" />}
            <div>
              <span className="font-extrabold block">
                {isPrivate ? "🔒 Privát Média (Token Védett)" : "🌐 Publikus Média (Hirdetéshez / Profilon)"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {isPrivate ? "Csak te és a jogosultak láthatják." : "Bárki láthatja a nyilvános hirdetéseidnél."}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold border bg-background hover:bg-muted transition"
          >
            Váltás: {isPrivate ? "🌐 Publikusra" : "🔒 Privátra"}
          </button>
        </div>
      </div>

      {/* Grid of uploaded thumbnails + Add button */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {mediaUrls.slice(0, maxFiles).map((url, idx) => (
          <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border bg-slate-900 group shadow-sm">
            {url.includes(".mp4") || url.includes(".webm") || url.includes("video") || url.startsWith("blob:video") ? (
              <video src={url} className="w-full h-full object-cover" controls />
            ) : (
              <img
                src={url}
                alt={`Média ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemove(idx);
              }}
              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition shadow hover:scale-110 cursor-pointer"
              title="Média törlése"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* File upload input button */}
        {mediaUrls.length < maxFiles && (
          <label className="aspect-square rounded-2xl border-2 border-dashed border-violet-400 hover:border-violet-600 bg-violet-50/60 dark:bg-violet-950/30 flex flex-col items-center justify-center p-3 text-center transition cursor-pointer group shadow-sm hover:shadow">
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 text-violet-600 animate-spin mb-1" />
                <span className="text-[11px] font-bold text-violet-600">Feltöltés...</span>
              </>
            ) : (
              <>
                <div className="p-2.5 rounded-2xl bg-violet-600 text-white mb-1.5 group-hover:scale-110 transition shadow">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-extrabold text-foreground">
                  {acceptVideo ? "Kép / Videó feltöltése" : "Kép feltöltése"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                  {acceptVideo ? "Max. 20MB kép / 100MB videó" : "Max. 20MB / kép"}
                </span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptVideo ? "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.avif,video/*" : "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.avif"}
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Direct file browser bar */}
      <div className="flex items-center gap-2 pt-1">
        <label className="flex-1 px-3 py-2 rounded-xl border bg-background hover:bg-muted text-xs font-bold text-foreground flex items-center justify-between cursor-pointer transition">
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-violet-600" />
            Válassz ki fájlokat a gépedről (JPEG, PNG, WebP, GIF, AVIF / MP4, MOV, WebM)...
          </span>
          <span className="bg-violet-600 text-white text-[10px] px-2.5 py-1 rounded-lg font-extrabold">Tallózás</span>
          <input
            type="file"
            multiple
            accept={acceptVideo ? "image/*,video/*" : "image/*"}
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
