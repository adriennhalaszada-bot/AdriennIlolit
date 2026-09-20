import { useRef, useState, useCallback } from "react";
import { customFetch } from "@workspace/api-client-react";
import { X, ImagePlus, Loader2, GripVertical, Video, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  folder?: "listings" | "beauty";
  videoUrl?: string;
  onVideoChange?: (url: string) => void;
}

export function ImageUploader({
  value,
  onChange,
  maxImages = 5,
  folder = "listings",
  videoUrl = "",
  onVideoChange
}: ImageUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const isImageFile = (file: File): boolean => {
    if (!file) return false;
    if (file.type && file.type.startsWith("image/")) return true;
    if (file.type && (file.type.includes("heic") || file.type.includes("heif"))) return true;
    const name = file.name?.toLowerCase() || "";
    return /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|svg)$/i.test(name) || !file.type;
  };

  const processFileToUrl = async (file: File): Promise<string> => {
    if (file.size > 20 * 1024 * 1024) throw new Error("A kép legfeljebb 20 MB lehet.");
    const uploaded = await customFetch<{ url: string }>("/api/media/upload", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        "X-Media-Folder": folder,
      },
      body: file,
    });
    if (!uploaded.url) throw new Error("A Cloudflare nem adott vissza kép URL-t.");
    return uploaded.url;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = maxImages - value.length;
    if (remaining <= 0) {
      toast({ title: `Maximum ${maxImages} fotó tölthető fel`, variant: "destructive" });
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of toUpload) {
        if (!isImageFile(file)) {
          toast({ title: `${file.name} nem támogatott képfájl`, variant: "destructive" });
          continue;
        }

        const url = await processFileToUrl(file);
        if (url) {
          newUrls.push(url);
        }
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls]);
        toast({ title: "Fotók sikeresen hozzáadva!" });
      }
    } catch (err: any) {
      toast({ title: "Feltöltési hiba", description: err?.message || "Kérjük próbáld újra a fotók kiválasztását.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleVideoFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const supportedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!supportedTypes.includes(file.type)) {
      toast({ title: "Nem támogatott videó", description: "MP4, WebM vagy MOV fájlt válassz.", variant: "destructive" });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "A videó túl nagy", description: "A videó legfeljebb 100 MB lehet.", variant: "destructive" });
      return;
    }

    setVideoUploading(true);

    try {
      const tempUrl = URL.createObjectURL(file);
      const duration = await new Promise<number>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = tempUrl;
        video.onloadedmetadata = () => resolve(video.duration);
        video.onerror = () => reject(new Error("A videó adatai nem olvashatók."));
      }).finally(() => {
        URL.revokeObjectURL(tempUrl);
      });

      if (!Number.isFinite(duration) || duration > 20.5) {
        toast({
          title: "A videó túl hosszú",
          description: `A feltöltött videó ${Number.isFinite(duration) ? Math.round(duration) : "ismeretlen"} másodperces. Legfeljebb 20 másodperces videót tölthetsz fel.`,
          variant: "destructive",
        });
        return;
      }

      const uploaded = await customFetch<{ url: string }>("/api/media/upload", {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "X-File-Name": encodeURIComponent(file.name),
          "X-Media-Folder": folder,
        },
        body: file,
      });
      if (!uploaded.url) throw new Error("A Cloudflare nem adott vissza videó URL-t.");
      onVideoChange?.(uploaded.url);
      toast({ title: "A videó sikeresen feltöltve a Cloudflare tárhelyre." });
    } catch (e: any) {
      toast({ title: "Videófeltöltési hiba", description: e?.message || "Próbáld újra a videó kiválasztását.", variant: "destructive" });
    } finally {
      setVideoUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleDragStart = useCallback((idx: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    setDragIndex(idx);
  }, []);

  const handleDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(idx);
  }, []);

  const handleDrop = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const newOrder = [...value];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(idx, 0, moved);
    onChange(newOrder);
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, value, onChange]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. PHOTO UPLOADER SECTION (MAX 5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>📸 Termékfotók</span>
            <span className="text-slate-400 font-normal">({value.length} / max. {maxImages} fotó)</span>
          </label>
        </div>

        {value.length > 1 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <GripVertical className="w-3 h-3" /> Húzd a képeket a sorrend megváltoztatásához
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {value.map((url, idx) => (
            <div
              key={url}
              draggable
              onDragStart={(e) => handleDragStart(idx, e)}
              onDragOver={(e) => handleDragOver(idx, e)}
              onDrop={(e) => handleDrop(idx, e)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border bg-muted group cursor-grab active:cursor-grabbing transition-all duration-150 shadow-sm",
                dragIndex === idx && "opacity-40 scale-95 border-purple-500",
                overIndex === idx && dragIndex !== idx && "ring-2 ring-purple-500 ring-offset-1 scale-[1.03]"
              )}
            >
              <img src={url} alt={`Fotó ${idx + 1}`} className="object-cover w-full h-full pointer-events-none select-none" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-100 transition-opacity z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[9px] font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-black">
                  Borítókép
                </span>
              )}
            </div>
          ))}

          {value.length < maxImages && (
            <div>
              <label
                htmlFor="ilolit-photo-upload-input"
                className={cn(
                  "aspect-square rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-800 flex flex-col items-center justify-center gap-1 text-purple-700 dark:text-purple-300 hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors bg-purple-50/50 dark:bg-purple-950/20 cursor-pointer w-full h-full min-h-[100px]",
                  uploading && "opacity-50 cursor-not-allowed"
                )}
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-purple-600" />
                    <span className="text-[11px] font-extrabold text-center px-1">Fotó hozzáadása</span>
                  </>
                )}
              </label>

              <input
                id="ilolit-photo-upload-input"
                type="file"
                accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.avif"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={e => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 font-medium">
          Maximum {maxImages} fotó adható hozzá. Az első kép lesz a hirdetés borítóképe.
        </p>
      </div>

      {/* 2. VIDEO UPLOADER SECTION (MAX 1 VIDEO, MAX 20 SECONDS) */}
      {onVideoChange && (
        <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Video className="w-4 h-4 text-purple-600" />
              <span>🎬 Bemutatkozó videó (legfeljebb 20 mp)</span>
            </label>
          </div>

          {videoUrl ? (
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-purple-300 bg-black group max-w-sm">
              <video src={videoUrl} controls playsInline preload="metadata" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onVideoChange("")}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-rose-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="absolute bottom-2 left-2 text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                <Play className="w-2.5 h-2.5 fill-white" /> Bemutatkozó videó
              </span>
            </div>
          ) : (
            <div>
              <label
                htmlFor="ilolit-video-upload-input"
                className="w-full p-4 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 flex items-center justify-center gap-3 text-slate-700 dark:text-slate-300 hover:border-purple-600 transition cursor-pointer"
              >
                {videoUploading ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Videó ellenőrzése és feltöltése...</span>
                  </div>
                ) : (
                  <>
                    <Video className="w-6 h-6 text-purple-600 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-extrabold block text-slate-900 dark:text-white">
                        1 db legfeljebb 20 mp-es videó hozzáadása
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        MP4, WebM vagy MOV, legfeljebb 100 MB
                      </span>
                    </div>
                  </>
                )}
              </label>

              <input
                id="ilolit-video-upload-input"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                className="hidden"
                disabled={videoUploading}
                onChange={e => {
                  handleVideoFile(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
