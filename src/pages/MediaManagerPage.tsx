import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { CloudflareUploader } from "@/components/shared/CloudflareUploader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Cloud, Image as ImageIcon, Video, Trash2, Copy, Check, Lock, Globe,
  Shield, Key, HardDrive, RefreshCw, ExternalLink, Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaItem {
  id: string;
  type: "image" | "video";
  cloudflareId: string;
  url: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  visibility: "public" | "private";
  createdAt: string;
}

interface MediaStats {
  totalStorageUsedBytes: number;
  storageLimitBytes: number;
  uploadsTodayCount: number;
  maxDailyUploads: number;
  totalFilesCount: number;
}

export function MediaManagerPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<MediaStats>({
    totalStorageUsedBytes: 0,
    storageLimitBytes: 1 * 1024 * 1024 * 1024,
    uploadsTodayCount: 0,
    maxDailyUploads: 50,
    totalFilesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Signed URL dialog state
  const [signedUrlData, setSignedUrlData] = useState<{ url: string; expiresAt: string } | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      toast({ title: "Nem sikerült betölteni a médiafájlokat", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleCopy = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: `${label} másolva vágólapra! 📋` });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleVisibility = async (item: MediaItem) => {
    const nextVis = item.visibility === "private" ? "public" : "private";
    try {
      const res = await fetch(`/api/media/${item.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: nextVis }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, visibility: nextVis } : m))
        );
        toast({
          title: nextVis === "private" ? "Fájl mostantól Privát 🔒" : "Fájl mostantól Nyilvános 🌐",
        });
      }
    } catch {
      toast({ title: "Láthatóság módosítása sikertelen", variant: "destructive" });
    }
  };

  const handleGetSignedUrl = async (item: MediaItem) => {
    try {
      const res = await fetch(`/api/media/${item.id}/signed-url`);
      if (res.ok) {
        const data = await res.json();
        setSignedUrlData({ url: data.signedUrl, expiresAt: data.expiresAt });
      }
    } catch {
      toast({ title: "Signed URL generálása hiba", variant: "destructive" });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/media/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        toast({ title: "Fájl sikeresen törölve a Cloudflare-ről! 🗑️" });
        setDeleteTarget(null);
        fetchMedia();
      }
    } catch {
      toast({ title: "Törlés sikertelen", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterTab === "images") return item.type === "image";
    if (filterTab === "videos") return item.type === "video";
    if (filterTab === "public") return item.visibility === "public";
    if (filterTab === "private") return item.visibility === "private";
    return true;
  });

  const usedMB = (stats.totalStorageUsedBytes / (1024 * 1024)).toFixed(1);
  const limitGB = (stats.storageLimitBytes / (1024 * 1024 * 1024)).toFixed(1);
  const usedPercent = Math.min(100, Math.round((stats.totalStorageUsedBytes / stats.storageLimitBytes) * 100));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* Top Title Banner */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-3xl shadow-inner">
              ☁️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-rose-500 text-white font-extrabold text-[10px] uppercase">
                  Cloudflare CDN & R2 Storage
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                Cloudflare Médiamenedzser
              </h1>
              <p className="text-sm text-slate-400">
                Képek és videók kezelése közvetlen Cloudflare Images & Stream kapcsolattal
              </p>
            </div>
          </div>

          <Button
            onClick={fetchMedia}
            variant="outline"
            size="sm"
            className="border-slate-700 hover:bg-slate-800 text-slate-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Frissítés
          </Button>
        </div>

        {/* Quota & Usage Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 rounded-2xl border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Média Tárhely Használat</span>
              <HardDrive className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-slate-900">{usedMB} MB</div>
              <div className="text-xs text-muted-foreground font-semibold">/ {limitGB} GB limit</div>
            </div>
            <Progress value={usedPercent} className="h-2" />
          </Card>

          <Card className="p-5 rounded-2xl border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Mai Feltöltések Quota</span>
              <Cloud className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-slate-900">{stats.uploadsTodayCount} fájl</div>
              <div className="text-xs text-muted-foreground font-semibold">/ {stats.maxDailyUploads} max/nap</div>
            </div>
            <Progress value={(stats.uploadsTodayCount / stats.maxDailyUploads) * 100} className="h-2" />
          </Card>

          <Card className="p-5 rounded-2xl border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Aktív Korlátok</span>
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-sm font-extrabold text-slate-900 flex flex-wrap gap-1">
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Max 6 db kép (20 MB)</Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Videó max 10 mp</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-bold pt-1">1 GB tárhely felhasználónként • Cloudflare CDN</p>
          </Card>
        </div>

        {/* Upload Zone */}
        <Card className="p-6 rounded-3xl border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-rose-500" /> Új Kép vagy Videó Feltöltése
          </h2>
          <CloudflareUploader onUploadSuccess={() => fetchMedia()} />
        </Card>

        {/* Media List Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 p-1 rounded-2xl">
                <TabsTrigger value="all" className="rounded-xl text-xs font-bold">Összes ({items.length})</TabsTrigger>
                <TabsTrigger value="images" className="rounded-xl text-xs font-bold">🖼️ Képek</TabsTrigger>
                <TabsTrigger value="videos" className="rounded-xl text-xs font-bold">🎬 Videók</TabsTrigger>
                <TabsTrigger value="public" className="rounded-xl text-xs font-bold">🌐 Nyilvános</TabsTrigger>
                <TabsTrigger value="private" className="rounded-xl text-xs font-bold">🔒 Privát</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 font-semibold">Médiafájlok betöltése...</div>
          ) : filteredItems.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl border-dashed border-2 border-slate-200">
              <p className="text-slate-500 font-bold text-base">Nincs megjeleníthető média ebben a kategóriában.</p>
              <p className="text-xs text-muted-foreground mt-1">Tölts fel egy új képet vagy videót a fenti mezőben!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="rounded-3xl overflow-hidden border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  {/* Media Content Preview */}
                  <div className="relative h-48 bg-slate-900 flex items-center justify-center overflow-hidden">
                    {item.type === "image" ? (
                      <img src={item.url} alt="Media" className="w-full h-full object-cover" />
                    ) : (
                      <video src={item.url} controls className="w-full h-full object-contain" />
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <Badge className={item.type === "video" ? "bg-purple-600" : "bg-emerald-600"}>
                        {item.type === "video" ? "🎬 VIDEÓ" : "🖼️ KÉP"}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3">
                      <Badge variant={item.visibility === "private" ? "destructive" : "secondary"}>
                        {item.visibility === "private" ? "🔒 Privát" : "🌐 Nyilvános"}
                      </Badge>
                    </div>
                  </div>

                  {/* Info Body */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-bold">{item.mimeType}</span>
                        <span>{(item.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Feltöltve: {new Date(item.createdAt).toLocaleString("hu-HU")}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs font-bold"
                          onClick={() => handleCopy(item.url, item.id, "Cloudflare CDN URL")}
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                          URL Másolása
                        </Button>

                        {item.visibility === "private" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs font-bold bg-amber-100 text-amber-900 hover:bg-amber-200"
                            onClick={() => handleGetSignedUrl(item)}
                            title="1 órás Signed URL generálása"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 h-8 w-8"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 px-1">
                        <span className="text-slate-600 font-semibold">Láthatóság:</span>
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={item.visibility === "public"}
                            onCheckedChange={() => handleToggleVisibility(item)}
                          />
                          <span className="text-[11px] font-bold">
                            {item.visibility === "public" ? "Nyilvános" : "Privát"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              Média törlése Cloudflare-ről
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Biztosan törölni szeretnéd ezt a fájlt? A művelet végleges, a fájl törlődik a Cloudflare Images / Stream tárhelyről is.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Mégse</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Törlés..." : "Végleges törlés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signed URL Result Modal */}
      <Dialog open={!!signedUrlData} onOpenChange={() => setSignedUrlData(null)}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" /> Időkorlátos Signed URL
            </DialogTitle>
          </DialogHeader>
          {signedUrlData && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">
                Ez a privát URL 1 órán keresztül érvényes (Lejárat: {new Date(signedUrlData.expiresAt).toLocaleTimeString("hu-HU")}).
              </p>
              <div className="p-3 bg-slate-100 rounded-xl font-mono text-xs break-all select-all">
                {signedUrlData.url}
              </div>
              <Button
                className="w-full font-bold bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => {
                  navigator.clipboard.writeText(signedUrlData.url);
                  toast({ title: "Signed URL másolva! 📋" });
                  setSignedUrlData(null);
                }}
              >
                URL Másolása
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
