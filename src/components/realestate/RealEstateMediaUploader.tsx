import { useCallback, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import {
  Camera,
  CheckCircle2,
  GripVertical,
  ImagePlus,
  Layers,
  Loader2,
  RotateCw,
  Star,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PropertyPhoto } from "@/lib/realEstate/types";
import { REAL_ESTATE_CONFIG } from "@/lib/realEstate/config";

interface RealEstateMediaUploaderProps {
  photos: PropertyPhoto[];
  onPhotosChange: (photos: PropertyPhoto[]) => void;
  floorPlans: PropertyPhoto[];
  onFloorPlansChange: (floorPlans: PropertyPhoto[]) => void;
  videoUrl: string;
  onVideoChange: (url: string) => void;
}

export function RealEstateMediaUploader({
  photos,
  onPhotosChange,
  floorPlans,
  onFloorPlansChange,
  videoUrl,
  onVideoChange,
}: RealEstateMediaUploaderProps) {
  const { toast } = useToast();
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingFloorPlans, setUploadingFloorPlans] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const uploadSingleFile = async (file: File): Promise<string> => {
    const uploaded = await customFetch<{ url: string }>("/api/media/upload", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        "X-Media-Folder": "listings",
      },
      body: file,
    });
    if (!uploaded.url) throw new Error("A feltöltés nem adott vissza elérési utat.");
    return uploaded.url;
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = REAL_ESTATE_CONFIG.maxPhotos - photos.length;
    if (remaining <= 0) {
      toast({
        title: `Legfeljebb ${REAL_ESTATE_CONFIG.maxPhotos} fotó tölthető fel`,
        variant: "destructive",
      });
      return;
    }

    setUploadingPhotos(true);
    const created: PropertyPhoto[] = [];
    const errors: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        if (file.size > 20 * 1024 * 1024) {
          errors.push(`${file.name}: legfeljebb 20 MB lehet`);
          continue;
        }
        try {
          const url = await uploadSingleFile(file);
          created.push({
            id: crypto.randomUUID(),
            url,
            rotation: 0,
            order: photos.length + created.length,
          });
        } catch (err: any) {
          errors.push(`${file.name}: ${err?.message || "feltöltési hiba"}`);
        }
      }
      if (created.length > 0) {
        onPhotosChange([...photos, ...created].map((item, idx) => ({ ...item, order: idx })));
        toast({ title: `${created.length} ingatlanfotó feltöltve` });
      }
      if (errors.length > 0) {
        toast({
          title: "Néhány fotó nem tölthető fel",
          description: errors.join("; "),
          variant: "destructive",
        });
      }
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleFloorPlanFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = REAL_ESTATE_CONFIG.maxFloorPlans - floorPlans.length;
    if (remaining <= 0) {
      toast({
        title: `Legfeljebb ${REAL_ESTATE_CONFIG.maxFloorPlans} alaprajz tölthető fel`,
        variant: "destructive",
      });
      return;
    }
    setUploadingFloorPlans(true);
    const created: PropertyPhoto[] = [];
    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        const url = await uploadSingleFile(file);
        created.push({
          id: crypto.randomUUID(),
          url,
          rotation: 0,
          order: floorPlans.length + created.length,
        });
      }
      if (created.length > 0) {
        onFloorPlansChange([...floorPlans, ...created].map((item, idx) => ({ ...item, order: idx })));
        toast({ title: "Alaprajz sikeresen feltöltve" });
      }
    } catch (err: any) {
      toast({
        title: "Alaprajz feltöltési hiba",
        description: err?.message || "Próbáld meg újra.",
        variant: "destructive",
      });
    } finally {
      setUploadingFloorPlans(false);
    }
  };

  const handleVideoFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      toast({ title: "MP4, WebM vagy MOV videót tölts fel", variant: "destructive" });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "A videó legfeljebb 100 MB lehet", variant: "destructive" });
      return;
    }
    setUploadingVideo(true);
    try {
      const url = await uploadSingleFile(file);
      onVideoChange(url);
      toast({ title: "Ingatlanvideó feltöltve" });
    } catch (err: any) {
      toast({
        title: "Videófeltöltési hiba",
        description: err?.message || "Próbáld meg újra.",
        variant: "destructive",
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const setAsCover = (idx: number) => {
    if (idx === 0) return;
    const next = [...photos];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    onPhotosChange(next.map((p, i) => ({ ...p, order: i })));
  };

  const rotatePhoto = (idx: number) => {
    const next = photos.map((p, i) =>
      i === idx ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p,
    );
    onPhotosChange(next);
  };

  const removePhoto = (idx: number) => {
    onPhotosChange(photos.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order: i })));
  };

  const rotateFloorPlan = (idx: number) => {
    onFloorPlansChange(
      floorPlans.map((fp, i) => (i === idx ? { ...fp, rotation: ((fp.rotation || 0) + 90) % 360 } : fp)),
    );
  };

  const removeFloorPlan = (idx: number) => {
    onFloorPlansChange(floorPlans.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order: i })));
  };

  const onDragStart = useCallback((idx: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    setDragIndex(idx);
  }, []);

  const onDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    setOverIndex(idx);
  }, []);

  const onDropReorder = useCallback(
    (idx: number, e: React.DragEvent) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === idx) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      const next = [...photos];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      onPhotosChange(next.map((p, i) => ({ ...p, order: i })));
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex, photos, onPhotosChange],
  );

  const meetsRecommendation = photos.length >= REAL_ESTATE_CONFIG.recommendedMinPhotos;

  return (
    <div className="space-y-8">
      {/* 1. Ingatlanfotók */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Camera className="h-4 w-4 text-emerald-600" />
              Ingatlanfotók ({photos.length} / {REAL_ESTATE_CONFIG.maxPhotos})
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Húzd a képeket a sorrend módosításához. Az első kép jelenik meg borítóképként.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
              meetsRecommendation
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-600",
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {meetsRecommendation
              ? "Ajánlott képszám teljesítve"
              : `Javasolt legalább ${REAL_ESTATE_CONFIG.recommendedMinPhotos} fotó (${photos.length}/${REAL_ESTATE_CONFIG.recommendedMinPhotos})`}
          </span>
        </div>

        {/* Drag & drop upload zone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDropActive(true);
          }}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDropActive(false);
            if (e.dataTransfer.files?.length) handlePhotoFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition",
            isDropActive
              ? "border-emerald-500 bg-emerald-50/70"
              : "border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/30",
            uploadingPhotos && "pointer-events-none opacity-60",
          )}
        >
          {uploadingPhotos ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              Fotók feltöltése...
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-emerald-600" />
              <span className="mt-2 text-sm font-bold text-slate-900">
                Húzd ide a fotókat, vagy kattints a tallózáshoz
              </span>
              <span className="mt-1 text-xs text-slate-500">
                JPG, PNG, WebP vagy AVIF · legfeljebb 20 MB / kép · akár több kép egyszerre
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={(e) => {
              handlePhotoFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        {/* Uploaded photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                draggable
                onDragStart={(e) => onDragStart(idx, e)}
                onDragOver={(e) => onDragOver(idx, e)}
                onDrop={(e) => onDropReorder(idx, e)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-white transition",
                  idx === 0 ? "border-emerald-400 ring-1 ring-emerald-200" : "border-slate-200",
                  dragIndex === idx && "opacity-40",
                  overIndex === idx && dragIndex !== idx && "ring-2 ring-emerald-500",
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img
                    src={photo.url}
                    alt={`Ingatlanfotó ${idx + 1}`}
                    style={{ transform: `rotate(${photo.rotation || 0}deg)` }}
                    className="h-full w-full object-cover transition-transform duration-200"
                  />
                  <div className="absolute left-2 top-2 flex items-center gap-1">
                    <span className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-slate-900/70 text-white">
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    {idx === 0 && (
                      <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                        Borítókép
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 border-t border-slate-100 bg-white px-2 py-1.5">
                  {idx > 0 ? (
                    <button
                      type="button"
                      onClick={() => setAsCover(idx)}
                      title="Beállítás borítóképként"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Borító
                    </button>
                  ) : (
                    <span className="px-2 text-[11px] font-semibold text-emerald-700">1. kép</span>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => rotatePhoto(idx)}
                      title="Forgatás 90 fokkal"
                      className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      title="Kép törlése"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Alaprajz */}
      <div className="space-y-3 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Layers className="h-4 w-4 text-emerald-600" />
              Alaprajz ({floorPlans.length} / {REAL_ESTATE_CONFIG.maxFloorPlans})
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Az alaprajz segíti az érdeklődőket a helyiségek elosztásának megértésében.
            </p>
          </div>
          {floorPlans.length < REAL_ESTATE_CONFIG.maxFloorPlans && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700">
              {uploadingFloorPlans ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Alaprajz feltöltése
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFloorPlanFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        {floorPlans.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {floorPlans.map((fp, idx) => (
              <div key={fp.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="aspect-[4/3] bg-slate-50 p-2">
                  <img
                    src={fp.url}
                    alt={`Alaprajz ${idx + 1}`}
                    style={{ transform: `rotate(${fp.rotation || 0}deg)` }}
                    className="h-full w-full object-contain transition-transform"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 px-2.5 py-1.5 text-xs">
                  <span className="font-semibold text-slate-600">Alaprajz {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => rotateFloorPlan(idx)}
                      title="Forgatás"
                      className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFloorPlan(idx)}
                      title="Törlés"
                      className="rounded-lg p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Opcionális videó */}
      <div className="space-y-3 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Video className="h-4 w-4 text-emerald-600" />
              Bemutató videó (opcionális)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Rövid séta a lakásban vagy a kertben (MP4, WebM, MOV · max. 100 MB).
            </p>
          </div>
        </div>

        {videoUrl ? (
          <div className="relative max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <video src={videoUrl} controls playsInline preload="metadata" className="aspect-video w-full object-cover" />
            <button
              type="button"
              onClick={() => onVideoChange("")}
              className="absolute right-2 top-2 rounded-full bg-slate-900/80 p-1.5 text-white hover:bg-rose-600"
              title="Videó eltávolítása"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-4 text-xs font-bold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50/30">
            {uploadingVideo ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                Videó feltöltése...
              </>
            ) : (
              <>
                <Video className="h-4 w-4 text-emerald-600" />
                Videó kiválasztása és feltöltése
              </>
            )}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                handleVideoFile(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
