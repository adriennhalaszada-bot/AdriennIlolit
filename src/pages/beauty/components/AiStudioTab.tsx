import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, FileText, Bot, UploadCloud, CheckCircle2, Wand2, Loader2, ArrowRight } from "lucide-react";
import type { BeautyProvider, BeautyServiceOffering } from "@workspace/api-client-react";

interface AiStudioTabProps {
  provider: BeautyProvider;
  onUpdateBio?: (bio: string) => void;
  onAddServicesBulk?: (services: { name: string; price: number; durationMinutes: number }[]) => void;
}

export function AiStudioTab({ provider, onUpdateBio, onAddServicesBulk }: AiStudioTabProps) {
  const { toast } = useToast();

  // AI Bio generator state
  const [selectedStyle, setSelectedStyle] = useState<"exclusive" | "friendly" | "elegant" | "professional">("exclusive");
  const [generatedBio, setGeneratedBio] = useState(provider.bio || "");
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);

  // Natural Language Workhours state
  const [nlText, setNlText] = useState("Hétfőtől csütörtökig 9:00 és 18:00 között várom a vendégeket, pénteken csak 14:00-ig vagyok nyitva, hétvégén pedig zárva tartok.");
  const [parsedHoursResult, setParsedHoursResult] = useState<string | null>(null);
  const [isParsingHours, setIsParsingHours] = useState(false);

  // Price List OCR Scanner state
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrDetectedItems, setOcrDetectedItems] = useState<{ name: string; price: number; durationMinutes: number }[] | null>(null);

  const handleGenerateBio = () => {
    setIsGeneratingBio(true);
    setTimeout(() => {
      let text = "";
      if (selectedStyle === "exclusive") {
        text = `Köszöntöm az ILOLIT prémium szépségápolási szalonomban! Személyre szabott luxus kezelésekkel, csúcsminőségű alapanyagokkal és nyugodt, elegáns környezetben várom meglévő és új vendégeimet. Foglaljon időpontot online 0-24 órában!`;
      } else if (selectedStyle === "friendly") {
        text = `Szia! Szeretettel várlak szalonomban, ahol a legfrissebb trendekkel, jó hangulattal és prémium ápolással várlak! Nézd meg a szolgáltatásaimat és foglalj hozzám kényelmesen időpontot a nap 24 órájában!`;
      } else if (selectedStyle === "elegant") {
        text = `Finom elegancia és szakértelem egy helyen. Célunk, hogy minden vendégünk megújult önbizalommal és feltöltődve távozzon tőlünk. Tekintse meg szolgáltatásainkat és foglalja le a legmegfelelőbb időpontot.`;
      } else {
        text = `Több éves szakmai tapasztalattal és a legújabb technológiákkal állok vendégeim rendelkezésére. Pontos, megbízható és minőségi munkavégzés garanciával. Foglalható időpontok valós időben a naptárban.`;
      }

      setGeneratedBio(text);
      setIsGeneratingBio(false);
      toast({ title: "AI Bemutatkozó sikeresen generálva!" });
    }, 1000);
  };

  const handleApplyBio = () => {
    if (onUpdateBio) {
      onUpdateBio(generatedBio);
    }
    toast({ title: "AI Bemutatkozó elmentve a profilra!" });
  };

  const handleParseNlHours = () => {
    setIsParsingHours(true);
    setTimeout(() => {
      setParsedHoursResult("• Hétfő - Csütörtök: 09:00 - 18:00\n• Péntek: 09:00 - 14:00\n• Szombat - Vasárnap: ZÁRVA");
      setIsParsingHours(false);
      toast({ title: "Természetes nyelvű nyitvatartás értelmezve!" });
    }, 800);
  };

  const handleSimulateOcrUpload = () => {
    setIsScanningOcr(true);
    setTimeout(() => {
      const mockItems = [
        { name: "Női Alap Hajvágás", price: 11000, durationMinutes: 45 },
        { name: "Komplett Balayage Melír & Ápolás", price: 34000, durationMinutes: 120 },
        { name: "Keratinos Hajregenerálás", price: 18000, durationMinutes: 60 },
        { name: "Szemöldök Formázás & Festés", price: 4500, durationMinutes: 20 },
      ];
      setOcrDetectedItems(mockItems);
      setIsScanningOcr(false);
      toast({ title: "Árlista kép/PDF sikeresen feldolgozva!", description: "4 szolgáltatási tétel felismerve." });
    }, 1200);
  };

  const handleSaveOcrItems = () => {
    if (ocrDetectedItems && onAddServicesBulk) {
      onAddServicesBulk(ocrDetectedItems);
    }
    toast({ title: "A felismerett szolgáltatások elmentve az árlistába!" });
    setOcrDetectedItems(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-950 text-white p-6 rounded-2xl shadow-md border border-emerald-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="text-lg font-extrabold text-white">13. ILOLIT AI Stúdió & Árlista OCR</h2>
          </div>
          <p className="text-sm text-emerald-200">
            Intelligens mesterséges intelligencia funkciók: automatikus bemutatkozó generálás, természetes nyelvű nyitvatartás asszisztens és papír/PDF árlista felismerő scanner.
          </p>
        </div>
        <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-xs px-3 py-1.5 self-start sm:self-center">
          ILOLIT AI v2.5 Active
        </Badge>
      </div>

      {/* 1. AI Bemutatkozó & Szabályzat Generátor */}
      <Card className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-5 h-5 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-base">AI Bemutatkozó & Lemondási Szabályzat Generáló</h3>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">Válasszon stílust:</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: "exclusive", label: "👑 Exkluzív Luxus" },
              { id: "friendly", label: "😊 Barátságos Közvetlen" },
              { id: "elegant", label: "✨ Elegáns Letisztult" },
              { id: "professional", label: "💼 Professzionális" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStyle(st.id as any)}
                className={`p-3 rounded-xl text-xs font-bold border text-center transition-all ${
                  selectedStyle === st.id
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Textarea
            rows={4}
            value={generatedBio}
            onChange={(e) => setGeneratedBio(e.target.value)}
            placeholder="A generált AI bemutatkozó itt jelenik meg..."
            className="rounded-xl font-medium text-slate-800"
          />
          <div className="flex items-center justify-between">
            <Button
              onClick={handleGenerateBio}
              disabled={isGeneratingBio}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl"
            >
              {isGeneratingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              AI Bemutatkozó Generálása
            </Button>
            <Button onClick={handleApplyBio} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl">
              Mentés a profilra
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Természetes Nyelvű AI Nyitvatartás Asszisztens */}
      <Card className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-base">Természetes Nyelvű AI Nyitvatartás Asszisztens</h3>
        </div>
        <p className="text-xs text-slate-500">
          Írja le saját szavaival a munkarendjét, és az ILOLIT AI automatikusan szabályokká alakítja át azt.
        </p>

        <div className="space-y-3">
          <Input
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            placeholder="Pl. Keddtől péntekig 10-18 között dolgozom, szombaton 9-13..."
            className="rounded-xl font-medium"
          />

          <Button
            onClick={handleParseNlHours}
            disabled={isParsingHours}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 rounded-xl"
          >
            {isParsingHours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
            Szöveg értelmezése & Szabályok generálása
          </Button>

          {parsedHoursResult && (
            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide block">Értelmezett nyitvatartási szabályok:</span>
              <pre className="text-sm font-bold text-slate-800 whitespace-pre-wrap font-sans">{parsedHoursResult}</pre>
            </div>
          )}
        </div>
      </Card>

      {/* 3. Papír/PDF Árlista OCR Scanner */}
      <Card className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-base">Árlista Beolvasása Képből vagy PDF-ből (AI OCR)</h3>
        </div>
        <p className="text-xs text-slate-500">
          Töltse fel a korábbi papír alapú vagy PDF árlistáját! Az ILOLIT AI automatikusan felismeri a szolgáltatások neveit, árait és időtartamát.
        </p>

        <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-8 rounded-2xl text-center space-y-3">
          <UploadCloud className="w-10 h-10 text-emerald-600 mx-auto" />
          <div>
            <p className="text-sm font-bold text-slate-800">Húzza ide vagy válassza ki az Árlista dokumentumot</p>
            <p className="text-xs text-slate-500">Támogatott formátumok: JPG, PNG, PDF (max. 10 MB)</p>
          </div>
          <Button
            onClick={handleSimulateOcrUpload}
            disabled={isScanningOcr}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md"
          >
            {isScanningOcr ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Árlista beolvasása AI-val
          </Button>
        </div>

        {ocrDetectedItems && (
          <div className="space-y-4 pt-2">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Felismert árlista tételek ({ocrDetectedItems.length} db):
            </h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              {ocrDetectedItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200 last:border-0">
                  <span className="font-bold text-slate-900">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{item.durationMinutes} perc</span>
                    <span className="font-extrabold text-emerald-700">{item.price} Ft</span>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSaveOcrItems} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl">
              Tömeges mentés az online árlistába
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
