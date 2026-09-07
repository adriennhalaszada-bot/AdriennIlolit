import { useState, useRef } from "react";
import { Upload, X, Check, Image as ImageIcon, Video, AlertCircle, RefreshCw, Sparkles, ShieldCheck, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CloudflareUploaderProps {
  onUploadSuccess?: (mediaItem: any) => void;
  allowedTypes?: "all" | "images" | "videos";
  maxFiles?: number;
  folder?: string;
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  type: "image" | "video";
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
  previewUrl?: string;
  mediaResult?: any;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB

export function CloudflareUploader({
  onUploadSuccess,
  allowedTypes = "all",
  maxFiles = 6,
  className = "",
}: CloudflareUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadList, setUploadList] = useState<UploadingFile[]>([]);

  const checkVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (uploadList.length + fileArray.length > maxFiles) {
      toast({
        title: "Túl sok fájl",
        description: `Egyszerre legfeljebb ${maxFiles} db fájl tölthető fel (max. 6 db kép).`,
        variant: "destructive",
      });
      return;
    }

    const newUploads: UploadingFile[] = [];

    for (const file of fileArray) {
      const isImg = ALLOWED_IMAGE_TYPES.includes(file.type) ||
        file.type.startsWith("image/") ||
        file.type.includes("heic") ||
        file.type.includes("heif") ||
        /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|svg)$/i.test(file.name) ||
        (!file.type && !file.name.endsWith(".mp4"));
      const isVid = ALLOWED_VIDEO_TYPES.includes(file.type) || file.type.startsWith("video/");

      if (!isImg && !isVid) {
        toast({
          title: "Nem támogatott formátum",
          description: `A(z) "${file.name}" fájl formátuma nem támogatott. (Engedélyezett: JPG, PNG, WebP, GIF, MP4, MOV, WebM)`,
          variant: "destructive",
        });
        continue;
      }

      if (allowedTypes === "images" && !isImg) {
        toast({ title: "Csak képek tölthetők fel (max. 6 db)", variant: "destructive" });
        continue;
      }

      if (allowedTypes === "videos" && !isVid) {
        toast({ title: "Csak videók tölthetők fel (max. 10 másodperc)", variant: "destructive" });
        continue;
      }

      if (isImg && file.size > MAX_IMAGE_SIZE) {
        toast({
          title: "Túl nagy képfájl",
          description: `A(z) "${file.name}" meghaladja a 20 MB korlátot.`,
          variant: "destructive",
        });
        continue;
      }

      if (isVid) {
        const duration = await checkVideoDuration(file);
        if (duration > 10) {
          toast({
            title: "Túl hosszú videó 🎬",
            description: `A(z) "${file.name}" hossza (${duration.toFixed(1)}s) meghaladja a megengedett 10 másodpercet!`,
            variant: "destructive",
          });
          continue;
        }
      }

      const uploadItem: UploadingFile = {
        id: `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        type: isVid ? "video" : "image",
        progress: 0,
        status: "pending",
        previewUrl: URL.createObjectURL(file),
      };

      newUploads.push(uploadItem);
    }

    if (newUploads.length > 0) {
      setUploadList((prev) => [...prev, ...newUploads]);
      newUploads.forEach((item) => executeUpload(item));
    }
  };

  const executeUpload = async (uploadItem: UploadingFile) => {
    setUploadList((prev) =>
      prev.map((item) => (item.id === uploadItem.id ? { ...item, status: "uploading", progress: 10 } : item))
    );

    try {
      // 1. Get Direct Upload URL from backend /api/media/upload-url
      const urlRes = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: uploadItem.type,
          fileName: uploadItem.file.name,
          fileSize: uploadItem.file.size,
          mimeType: uploadItem.file.type,
        }),
      });

      if (!urlRes.ok) {
        const errData = await urlRes.json();
        throw new Error(errData.error || "Feltöltési URL generálása sikertelen");
      }

      const urlData = await urlRes.json();
      const targetUploadUrl = urlData.uploadUrl || (uploadItem.type === "video" ? "/api/upload/video" : "/api/upload/image");

      setUploadList((prev) =>
        prev.map((item) => (item.id === uploadItem.id ? { ...item, progress: 35 } : item))
      );

      // 2. Direct Upload via XMLHttpRequest to support progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open("POST", targetUploadUrl, true);
      if (targetUploadUrl.includes("/api/upload/")) {
        xhr.setRequestHeader("Content-Type", uploadItem.file.type);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round(35 + (e.loaded / e.total) * 60);
          setUploadList((prev) =>
            prev.map((item) => (item.id === uploadItem.id ? { ...item, progress: percentComplete } : item))
          );
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);
          const finalMedia = res.media || {
            id: res.id || urlData.id,
            url: res.url || res.cdnUrl,
            type: uploadItem.type,
            fileSize: uploadItem.file.size,
            mimeType: uploadItem.file.type,
            createdAt: new Date().toISOString(),
          };

          setUploadList((prev) =>
            prev.map((item) =>
              item.id === uploadItem.id
                ? { ...item, status: "success", progress: 100, mediaResult: finalMedia }
                : item
            )
          );

          toast({
            title: "Sikeres feltöltés! ☁️",
            description: `${uploadItem.file.name} feltöltve a Cloudflare CDN-re.`,
          });

          if (onUploadSuccess) onUploadSuccess(finalMedia);
        } else {
          let errText = "Cloudflare feltöltési hiba";
          try {
            const errRes = JSON.parse(xhr.responseText);
            errText = errRes.error || errText;
          } catch {}
          throw new Error(errText);
        }
      };

      xhr.onerror = () => {
        throw new Error("Hálózati hiba történt a feltöltés közben.");
      };

      xhr.send(uploadItem.file);
    } catch (err: any) {
      setUploadList((prev) =>
        prev.map((item) =>
          item.id === uploadItem.id
            ? { ...item, status: "error", progress: 0, errorMessage: err.message || "Hiba történt" }
            : item
        )
      );

      toast({
        title: "Feltöltési hiba",
        description: err.message || "Nem sikerült feltölteni a fájlt.",
        variant: "destructive",
      });
    }
  };

  const removeFile = (id: string) => {
    setUploadList((prev) => prev.filter((item) => item.id !== id));
  };

  const retryUpload = (item: UploadingFile) => {
    executeUpload(item);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drag and Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 scale-[1.01]"
            : "border-slate-300 hover:border-rose-400 bg-slate-50/50 hover:bg-slate-100/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={
            allowedTypes === "images"
              ? ALLOWED_IMAGE_TYPES.join(",")
              : allowedTypes === "videos"
              ? ALLOWED_VIDEO_TYPES.join(",")
              : [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(",")
          }
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-md">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-base">
              Húzd ide a fájlokat vagy <span className="text-rose-600 underline">kattints a tallózáshoz</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Képek max. 6 db (max. 20 MB/kép) • Videók max. 10 másodperc • Tárhely limit: 1 GB
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Közvetlen Cloudflare Images & Stream CDN feltöltés</span>
          </div>
        </div>
      </div>

      {/* Progress & Upload Queue */}
      {uploadList.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
            <span>Feltöltési várólista ({uploadList.length})</span>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-slate-500 hover:text-slate-900"
              onClick={() => setUploadList([])}
            >
              Lista ürítése
            </Button>
          </h4>

          <div className="space-y-2">
            {uploadList.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Thumbnail Preview */}
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                    {item.type === "image" && item.previewUrl ? (
                      <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : item.type === "video" && item.previewUrl ? (
                      <div className="relative w-full h-full bg-slate-900 flex items-center justify-center text-white">
                        <Film className="w-5 h-5 text-rose-400" />
                      </div>
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                    <Badge
                      className={`absolute top-0.5 right-0.5 text-[8px] px-1 py-0 ${
                        item.type === "video" ? "bg-purple-600 text-white" : "bg-emerald-600 text-white"
                      }`}
                    >
                      {item.type === "video" ? "VID" : "IMG"}
                    </Badge>
                  </div>

                  {/* Info & Progress */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.file.name}</p>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Progress value={item.progress} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-extrabold text-slate-600">{item.progress}%</span>
                    </div>

                    {item.errorMessage && (
                      <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {item.errorMessage}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {item.status === "error" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                      onClick={() => retryUpload(item)}
                      title="Újrapróbálkozás"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                  {item.status === "success" && (
                    <span className="text-emerald-600 bg-emerald-50 p-1.5 rounded-full">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-slate-700"
                    onClick={() => removeFile(item.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
