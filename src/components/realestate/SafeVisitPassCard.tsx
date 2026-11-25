import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  FileCheck2,
  IdCard,
  Users,
  QrCode,
  AlertCircle,
} from "lucide-react";
import type { SafeVisitPass } from "@/lib/realEstate/types";
import { SAFEVISIT_STAGE_LABELS } from "@/lib/realEstate/config";
import { SafeVisitQrCode } from "./SafeVisitQrCode";

interface SafeVisitPassCardProps {
  pass: SafeVisitPass;
  propertyTitle: string;
  coverImage?: string;
  exactAddressText: string;
  date: string;
  startTime: string;
  endTime?: string;
}

function formatSpacedCode(code: string): string {
  return code.replace(/\s+/g, "").split("").join(" ");
}

function formatWindowTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("hu-HU", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export const SafeVisitPassCard: React.FC<SafeVisitPassCardProps> = ({
  pass,
  propertyTitle,
  coverImage,
  exactAddressText,
  date,
  startTime,
  endTime,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!pass.code) return;
    try {
      await navigator.clipboard.writeText(pass.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const isActive = pass.codeStatus === "ACTIVE" && Boolean(pass.code);
  const stageLabel = SAFEVISIT_STAGE_LABELS[pass.visitStage]?.label || "Ütemezve";

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
      {/* Header banner */}
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              ILOLIT SafeVisit · Digitális megtekintési igazolvány
            </p>
            <p className="text-sm font-bold text-slate-900">Megtekintésed visszaigazolva</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200">
          {stageLabel}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Property + Date summary */}
        <div className="flex items-start gap-3">
          {coverImage && (
            <img
              src={coverImage}
              alt={propertyTitle}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          )}
          <div className="min-w-0 space-y-1">
            <h4 className="text-sm font-bold text-slate-900 line-clamp-2">{propertyTitle}</h4>
            <p className="text-xs text-slate-700 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
              <span className="font-medium">{exactAddressText}</span>
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {date}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {startTime}
                {endTime ? ` – ${endTime}` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* 6-digit code & QR code panel */}
        {isActive && pass.code ? (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Egyedi megtekintési kódod:
              </p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.22em] text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-300 select-all"
                  data-testid="safevisit-code-value"
                >
                  {formatSpacedCode(pass.code)}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Másolva
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Másolás
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Érkezéskor mutasd meg a kódot vagy a QR-kódot a hirdetőnek. A kód egyszer használatos és kizárólag a
                megtekintés időablakában érvényes ({formatWindowTime(pass.validFrom)} –{" "}
                {formatWindowTime(pass.validUntil)}).
              </p>
            </div>

            {pass.qrToken && (
              <div className="flex flex-col items-center gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200 self-center justify-self-center">
                <SafeVisitQrCode value={pass.qrToken} size={132} />
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                  <QrCode className="w-3 h-3" />
                  Helyszíni QR-kód
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-700">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              {pass.codeStatus === "USED"
                ? "Az egyedi megtekintési kód már felhasználásra került a helyszíni ellenőrzés során."
                : "A megtekintési kód már nem aktív (érvénytelenítve vagy lejárt)."}
            </div>
          </div>
        )}

        {/* Buyer verification & declarations status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <User className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="text-slate-600">Érdeklődő:</span>
            <span className="font-semibold text-slate-900 truncate">{pass.requesterName}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-slate-600">Telefonszám:</span>
            <span className="font-semibold text-emerald-800">
              {pass.phoneVerified ? "SMS-ben ellenőrzött" : "Nincs ellenőrizve"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-slate-600">Kötelező nyilatkozatok:</span>
            <span className="font-semibold text-emerald-800">
              {pass.declarationsAccepted ? "Elfogadva" : "Rögzítve"}
            </span>
          </div>
          {pass.companionsRequired && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <Users className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="text-slate-600">Bejelentett kísérők:</span>
              <span className="font-semibold text-slate-900">
                {pass.companionsCount === 0 ? "Egyedül érkezik" : `${pass.companionsCount ?? 0} fő`}
              </span>
            </div>
          )}
        </div>

        {/* Active safety requirements reminder */}
        {pass.photoIdRequired && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-amber-950">
            <IdCard className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Fényképes igazolvány bemutatása szükséges érkezéskor</p>
              <p className="text-amber-900/90 leading-relaxed">
                Kérjük, hozz magaddal érvényes fényképes igazolványt (személyi igazolvány, útlevél vagy jogosítvány)
                helyszíni szemrevételezéshez. Az igazolványról másolat vagy fénykép nem készülhet.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Ellenőrzött elérhetőség. Hirdetői jóváhagyás. Visszaélés elleni védelem.</span>
        </div>
      </div>
    </div>
  );
};

export default SafeVisitPassCard;
