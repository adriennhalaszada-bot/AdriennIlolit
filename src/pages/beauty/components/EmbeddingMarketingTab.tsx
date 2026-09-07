import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Code2, QrCode, Share2, Copy, Check, ExternalLink, Sparkles, Download, BarChart2 } from "lucide-react";
import type { BeautyProvider } from "@workspace/api-client-react";

interface EmbeddingMarketingTabProps {
  provider: BeautyProvider;
}

export function EmbeddingMarketingTab({ provider }: EmbeddingMarketingTabProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [metaPixelId, setMetaPixelId] = useState("");
  const [googleAdsId, setGoogleAdsId] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("Köszönjük foglalását! Várjuk szeretettel szalonunkban.");

  const publicUrl = `${window.location.origin}/beauty/${provider.id}`;
  const iframeSnippet = `<iframe src="${publicUrl}?embed=true" width="100%" height="700" frameborder="0"></iframe>`;
  const buttonSnippet = `<a href="${publicUrl}" target="_blank" style="background:#059669;color:#fff;padding:12px 24px;border-radius:12px;font-weight:bold;text-decoration:none;display:inline-block;">Online Időpontfoglalás (ILOLIT)</a>`;

  const handleCopy = (text: string, isLink = false) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
    toast({ title: "Sikeresen másolva a vágólapra!" });
  };

  const handleSaveMarketing = () => {
    toast({ title: "Marketing és konverziós beállítások elmentve!" });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-slate-900">14. Beágyazás, QR-Kód & Marketing</h2>
          </div>
          <p className="text-sm text-slate-500">
            Helyezze el a foglalómodult saját weboldalán, töltsön le nyomtatható QR-kódot és kövesse nyomon a hirdetéseit.
          </p>
        </div>
      </div>

      {/* 1. Beágyazó Kódok */}
      <Card className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Code2 className="w-5 h-5 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-base">Foglalómodul beágyazása meglévő weboldalba</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">1. Közvetlen foglalói hivatkozás URL</label>
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="rounded-xl font-mono text-xs bg-slate-50" />
              <Button onClick={() => handleCopy(publicUrl, true)} variant="outline" className="rounded-xl font-bold gap-1.5 border-emerald-300 text-emerald-700">
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Másolás
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">2. Beágyazható kód (iFrame)</label>
            <div className="relative">
              <Textarea readOnly rows={2} value={iframeSnippet} className="rounded-xl font-mono text-xs bg-slate-900 text-emerald-400 p-3" />
              <Button
                size="sm"
                onClick={() => handleCopy(iframeSnippet)}
                className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs rounded-lg gap-1"
              >
                {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Kód másolása
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">3. Beágyazható Foglaló gomb HTML</label>
            <div className="relative">
              <Textarea readOnly rows={2} value={buttonSnippet} className="rounded-xl font-mono text-xs bg-slate-900 text-emerald-400 p-3" />
              <Button
                size="sm"
                onClick={() => handleCopy(buttonSnippet)}
                className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs rounded-lg gap-1"
              >
                <Copy className="w-3 h-3" /> Gomb kód másolása
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Nyomtatható QR Kód */}
      <Card className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-base">Nyomtatható ILOLIT QR-Kód</h3>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Nyomtassa ki üzlethelyiségében, névjegykártyáján vagy szórólapjain! A vendégek telefonjuk kamerájával azonnal az Ön online naptárába jutnak.
            </p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md mt-2"
              onClick={() => toast({ title: "QR-kód letöltése kezdeményezve (PNG/PDF)" })}
            >
              <Download className="w-4 h-4" /> QR-Kód letöltése (Nagy felbontás)
            </Button>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-emerald-500/20 shadow-sm flex flex-col items-center">
            {/* Real QR Code visualization */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(publicUrl)}`}
              alt="ILOLIT QR Code"
              className="w-40 h-40 rounded-xl"
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Scan for 0-24h Booking</span>
          </div>
        </div>
      </Card>

      {/* 3. Konverziókövetés & Egyedi Köszönőoldal */}
      <Card className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="w-5 h-5 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-base">Konverziókövetés & Egyedi Köszönő üzenet</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Meta Pixel ID (Facebook Hirdetéshez)</label>
            <Input
              placeholder="Pl. 1234567890"
              value={metaPixelId}
              onChange={(e) => setMetaPixelId(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Google Ads Conversion ID</label>
            <Input
              placeholder="Pl. AW-123456789"
              value={googleAdsId}
              onChange={(e) => setGoogleAdsId(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Egyedi köszönőoldal szövege sikeres foglalás után</label>
          <Textarea
            rows={2}
            value={thankYouMessage}
            onChange={(e) => setThankYouMessage(e.target.value)}
            className="rounded-xl font-medium"
          />
        </div>

        <Button onClick={handleSaveMarketing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
          Marketing beállítások mentése
        </Button>
      </Card>
    </div>
  );
}
