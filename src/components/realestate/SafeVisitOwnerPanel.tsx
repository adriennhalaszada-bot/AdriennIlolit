import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  QrCode,
  CheckCircle2,
  XCircle,
  IdCard,
  UserCheck,
  Flag,
  BookOpen,
  SlidersHorizontal,
  History,
  Camera,
  AlertTriangle,
  Clock,
  Lock,
  Loader2,
  Calendar,
} from "lucide-react";
import type {
  RealEstateProperty,
  ViewingRequest,
  SafeVisitIdCheckResult,
  SafeVisitSettings,
} from "@/lib/realEstate/types";
import { realEstateApi } from "@/lib/realEstate/api";
import { ID_CHECK_RESULT_OPTIONS, SAFEVISIT_STAGE_LABELS } from "@/lib/realEstate/config";
import { SafeVisitGuideContent } from "./SafeVisitGuideModal";

interface SafeVisitOwnerPanelProps {
  property: RealEstateProperty;
  viewings: ViewingRequest[];
  getToken: () => Promise<string | null>;
  onRefresh: () => Promise<void> | void;
  onReportViewing: (viewing: ViewingRequest) => void;
}

type SubTab = "verify" | "settings" | "guide" | "history";

export const SafeVisitOwnerPanel: React.FC<SafeVisitOwnerPanelProps> = ({
  property,
  viewings,
  getToken,
  onRefresh,
  onReportViewing,
}) => {
  const [subTab, setSubTab] = useState<SubTab>("verify");

  // Active approved viewings for this property
  const approvedViewings = viewings.filter((v) => v.status === "APPROVED");
  const pastOrProcessedViewings = viewings.filter(
    (v) =>
      v.safeVisit?.outcome ||
      v.safeVisit?.verifiedAt ||
      ["REJECTED", "REVOKED_BY_OWNER", "CANCELLED_BY_REQUESTER"].includes(v.status),
  );

  const [selectedViewingId, setSelectedViewingId] = useState<string>(approvedViewings[0]?.id || "");
  useEffect(() => {
    if (!approvedViewings.some((v) => v.id === selectedViewingId)) {
      setSelectedViewingId(approvedViewings[0]?.id || "");
    }
  }, [approvedViewings.length, selectedViewingId]);

  const selectedViewing = approvedViewings.find((v) => v.id === selectedViewingId) || null;

  // Code verification state
  const [codeInput, setCodeInput] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    title: string;
    disclaimer?: string;
    guidance?: string;
    requesterName?: string;
    phoneVerified?: boolean;
    date?: string;
    startTime?: string;
    endTime?: string;
    declarationsAccepted?: boolean;
    agentExclusionAccepted?: boolean;
    bookingApproved?: boolean;
    idCheckRequired?: boolean;
    companionsCount?: number;
  } | null>(null);

  // Camera QR scan support (uses native BarcodeDetector when available)
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => () => stopCamera(), []);

  // ID check, arrival & outcome states
  const [selectedIdOutcome, setSelectedIdOutcome] = useState<SafeVisitIdCheckResult>("MATCHED");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [outcomeNote, setOutcomeNote] = useState("");

  // Security settings state
  const currentSv: SafeVisitSettings = {
    requireVerifiedPhone: true,
    requirePhotoIdOnArrival: Boolean(property.safeVisitSettings?.requirePhotoIdOnArrival),
    enableSafeVisitCode: property.safeVisitSettings?.enableSafeVisitCode !== false,
    requireCompanionsDisclosure: Boolean(property.safeVisitSettings?.requireCompanionsDisclosure),
  };
  const [draftSettings, setDraftSettings] = useState<SafeVisitSettings>(currentSv);
  const [draftPolicy, setDraftPolicy] = useState<"no_agents" | "allow_agents">(
    property.agentInquiryPolicy === "allow_agents" ? "allow_agents" : "no_agents",
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraftSettings({
      requireVerifiedPhone: true,
      requirePhotoIdOnArrival: Boolean(property.safeVisitSettings?.requirePhotoIdOnArrival),
      enableSafeVisitCode: property.safeVisitSettings?.enableSafeVisitCode !== false,
      requireCompanionsDisclosure: Boolean(property.safeVisitSettings?.requireCompanionsDisclosure),
    });
    setDraftPolicy(property.agentInquiryPolicy === "allow_agents" ? "allow_agents" : "no_agents");
  }, [property.id, property.safeVisitSettings, property.agentInquiryPolicy]);

  const handleVerify = async (payload: { code?: string; qrToken?: string }) => {
    if (!selectedViewing) return;
    setVerifying(true);
    setVerifyResult(null);
    setActionMessage(null);
    try {
      await getToken();
      const res = await realEstateApi.verifySafeVisitCode(selectedViewing.id, payload);
      setVerifyResult(res);
      setCodeInput("");
      setQrInput("");
      await onRefresh();
    } catch (err: any) {
      setVerifyResult({
        valid: false,
        title: "A megtekintési kód nem érvényes.",
        guidance:
          err?.message ||
          "Kérjük, ellenőrizd a foglalás adatait a fiókodban, és szükség esetén ne engedj be ellenőrizetlen személyt.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const startCameraScan = async () => {
    setCameraError(null);
    const Detector = (window as any).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Ezen a böngészőn a kamera QR-olvasás nem támogatott. Használd a 6 jegyű kód mezőt vagy illeszd be a QR-kód tokenjét.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          const detector = new Detector({ formats: ["qr_code"] });
          const scanLoop = async () => {
            if (!streamRef.current || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                const raw = String(codes[0].rawValue).trim();
                stopCamera();
                await handleVerify({ qrToken: raw });
                return;
              }
            } catch {
              // continue scanning
            }
            if (streamRef.current) {
              requestAnimationFrame(() => {
                setTimeout(scanLoop, 350);
              });
            }
          };
          scanLoop();
        }
      }, 150);
    } catch {
      setCameraError("Nem sikerült elindítani a kamerát. Ellenőrizd a kamera engedélyeit vagy írd be a 6 jegyű kódot.");
      stopCamera();
    }
  };

  const handleRecordIdCheck = async () => {
    if (!selectedViewing) return;
    setBusyAction("id-check");
    setActionMessage(null);
    try {
      await getToken();
      await realEstateApi.recordVisualIdCheck(selectedViewing.id, selectedIdOutcome);
      setActionMessage({
        type: "ok",
        text:
          selectedIdOutcome === "MATCHED"
            ? "Szemrevételezéses igazolvány-ellenőrzés rögzítve. Most rögzítheted a megérkezést."
            : "A belépés megtagadása rögzítve lett a megtekintési naplóban.",
      });
      await onRefresh();
    } catch (err: any) {
      setActionMessage({ type: "err", text: err?.message || "Nem sikerült rögzíteni az ellenőrzést." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRecordArrival = async () => {
    if (!selectedViewing) return;
    setBusyAction("arrival");
    setActionMessage(null);
    try {
      await getToken();
      await realEstateApi.recordArrival(selectedViewing.id);
      setActionMessage({
        type: "ok",
        text: "Megérkezés rögzítve. Állapot: Megérkezett – megtekintés folyamatban.",
      });
      await onRefresh();
    } catch (err: any) {
      setActionMessage({ type: "err", text: err?.message || "Nem sikerült rögzíteni a megérkezést." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRecordOutcome = async (outcome: "COMPLETED" | "NO_SHOW" | "DENIED_ENTRY" | "INTERRUPTED") => {
    if (!selectedViewing) return;
    setBusyAction(outcome);
    setActionMessage(null);
    try {
      await getToken();
      await realEstateApi.recordVisitOutcome(selectedViewing.id, outcome, outcomeNote.trim() || undefined);
      setOutcomeNote("");
      setActionMessage({
        type: "ok",
        text: `Megtekintés lezárva időbélyeggel: ${SAFEVISIT_STAGE_LABELS[outcome]?.label || outcome}.`,
      });
      await onRefresh();
    } catch (err: any) {
      setActionMessage({ type: "err", text: err?.message || "Nem sikerült lezárni a megtekintést." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSavedMsg(null);
    try {
      await getToken();
      await realEstateApi.updateProperty(property.id, {
        agentInquiryPolicy: draftPolicy,
        safeVisitSettings: draftSettings,
      });
      setSettingsSavedMsg("A megtekintési biztonsági beállítások mentésre kerültek.");
      await onRefresh();
    } catch (err: any) {
      setSettingsSavedMsg(err?.message || "Hiba a mentés során.");
    } finally {
      setSavingSettings(false);
    }
  };

  const sv = selectedViewing?.safeVisit;
  const isCodeVerified = Boolean(sv?.verifiedAt);
  const needsIdCheck = Boolean(sv?.idCheckRequired || property.safeVisitSettings?.requirePhotoIdOnArrival);
  const idMatched = sv?.idCheckResult === "MATCHED";
  const canRecordArrival =
    Boolean(selectedViewing) &&
    isCodeVerified &&
    (!needsIdCheck || idMatched) &&
    sv?.visitStage !== "ARRIVED_IN_PROGRESS" &&
    !sv?.outcome;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                ILOLIT SafeVisit – Biztonság és megtekintési feltételek
              </h2>
              <p className="text-xs text-slate-600">
                Ellenőrzött elérhetőség. Hirdetői jóváhagyás. Visszaélés elleni védelem. (Az alapdíj része, külön díj nélkül.)
              </p>
            </div>
          </div>
        </div>

        {/* Sub-navigation */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { id: "verify" as SubTab, label: "Egyedi megtekintési kód ellenőrzése", icon: KeyRound },
            { id: "settings" as SubTab, label: "Megtekintési biztonsági beállítások", icon: SlidersHorizontal },
            { id: "guide" as SubTab, label: "Hirdetői biztonsági kisokos", icon: BookOpen },
            { id: "history" as SubTab, label: `Korábbi megtekintések (${pastOrProcessedViewings.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: ON-SITE CODE VERIFICATION, ID CHECK, ARRIVAL & OUTCOME */}
      {subTab === "verify" && (
        <div className="space-y-4">
          {approvedViewings.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-2">
              <KeyRound className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Nincs aktív jóváhagyott megtekintés</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Amint jóváhagysz egy beérkező megtekintési kérelmet, a rendszer automatikusan legenerálja az egyedi
                6 jegyű megtekintési kódot és QR-kódot az érdeklődőnek, amelyet itt érkezéskor ellenőrizhetsz.
              </p>
            </div>
          ) : (
            <>
              {/* Select approved viewing */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">1. Válaszd ki a jóváhagyott megtekintést</h3>
                  {sv && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                      Állapot: {SAFEVISIT_STAGE_LABELS[sv.visitStage]?.label || sv.visitStage}
                    </span>
                  )}
                </div>

                <select
                  value={selectedViewingId}
                  onChange={(e) => {
                    setSelectedViewingId(e.target.value);
                    setVerifyResult(null);
                    setActionMessage(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {approvedViewings.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.date} {v.startTime}–{v.endTime} · {v.requesterName} (
                      {v.safeVisit?.visitStage ? SAFEVISIT_STAGE_LABELS[v.safeVisit.visitStage]?.label : "Jóváhagyva"})
                    </option>
                  ))}
                </select>

                {selectedViewing?.testVerificationPreviewCode && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs text-sky-900 flex items-center justify-between gap-2 flex-wrap">
                    <span>
                      Teszt érdeklődő kipróbálási kódja (csak teszt foglalásnál látható):{" "}
                      <strong className="font-mono text-sm tracking-widest">
                        {selectedViewing.testVerificationPreviewCode}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCodeInput(selectedViewing.testVerificationPreviewCode || "")}
                      className="text-xs font-semibold text-sky-800 underline"
                    >
                      Beillesztés
                    </button>
                  </div>
                )}

                {/* Code input + QR verification */}
                {!isCodeVerified && !sv?.outcome && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <KeyRound className="w-4 h-4 text-emerald-700" />
                        6 jegyű megtekintési kód beírása
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={10}
                          value={codeInput}
                          onChange={(e) => setCodeInput(e.target.value.replace(/[^\d\s]/g, ""))}
                          placeholder="pl. 842916"
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-base tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          disabled={verifying || codeInput.replace(/\s+/g, "").length !== 6}
                          onClick={() => handleVerify({ code: codeInput.replace(/\s+/g, "") })}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          Ellenőrzés
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <QrCode className="w-4 h-4 text-emerald-700" />
                          QR-kód beolvasása
                        </span>
                        <button
                          type="button"
                          onClick={cameraOpen ? stopCamera : startCameraScan}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {cameraOpen ? "Kamera bezárása" : "Kamera indítása"}
                        </button>
                      </div>
                      {cameraOpen && (
                        <div className="rounded-lg overflow-hidden border border-slate-300 bg-black">
                          <video ref={videoRef} className="w-full h-44 object-cover" muted playsInline />
                        </div>
                      )}
                      {cameraError && <p className="text-xs text-amber-800">{cameraError}</p>}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={qrInput}
                          onChange={(e) => setQrInput(e.target.value)}
                          placeholder="Vagy QR-token beillesztése (sv_...)"
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          disabled={verifying || !qrInput.trim()}
                          onClick={() => handleVerify({ qrToken: qrInput.trim() })}
                          className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
                        >
                          QR ellenőrzés
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification result feedback */}
                {verifyResult && (
                  <div
                    className={`rounded-xl border p-4 space-y-2.5 ${
                      verifyResult.valid
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {verifyResult.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-700 shrink-0" />
                      )}
                      <h4
                        className={`text-sm font-bold ${
                          verifyResult.valid ? "text-emerald-950" : "text-rose-950"
                        }`}
                      >
                        {verifyResult.title}
                      </h4>
                    </div>

                    {verifyResult.valid ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-800">
                          <div>Érdeklődő neve: <strong>{verifyResult.requesterName}</strong></div>
                          <div>Telefonszám: <strong>{verifyResult.phoneVerified ? "SMS-ben ellenőrzött" : "Nincs ellenőrizve"}</strong></div>
                          <div>Időpont: <strong>{verifyResult.date} {verifyResult.startTime}–{verifyResult.endTime}</strong></div>
                          <div>Foglalás: <strong>Jóváhagyva</strong></div>
                          <div>Kötelező nyilatkozatok: <strong>{verifyResult.declarationsAccepted ? "Elfogadva" : "Rögzítve"}</strong></div>
                          {verifyResult.agentExclusionAccepted && (
                            <div>Ingatlanközvetítői tilalom: <strong>Elfogadva</strong></div>
                          )}
                        </div>
                        <p className="text-xs text-emerald-900 bg-white/80 rounded-lg border border-emerald-200 px-3 py-2 leading-relaxed">
                          {verifyResult.disclaimer ||
                            "A kód az adott foglaláshoz való hozzáférést igazolja. A megjelent személy személyazonosságának ellenőrzésére önmagában nem alkalmas."}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-rose-900 leading-relaxed">{verifyResult.guidance}</p>
                    )}
                  </div>
                )}

                {isCodeVerified && !verifyResult && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Érvényes megtekintési kód (ellenőrizve:{" "}
                      {sv?.verifiedAt ? new Date(sv.verifiedAt).toLocaleString("hu-HU") : ""})
                    </div>
                    <p>
                      A kód az adott foglaláshoz való hozzáférést igazolja. A megjelent személy személyazonosságának
                      ellenőrzésére önmagában nem alkalmas.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Optional Visual Photo ID check (STRICTLY NO UPLOAD / NO ID DATA FIELDS!) */}
              {selectedViewing && isCodeVerified && needsIdCheck && !sv?.outcome && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <IdCard className="w-5 h-5 text-emerald-700" />
                      <h3 className="text-sm font-bold text-slate-900">
                        2. Helyszíni szemrevételezéses igazolvány-ellenőrzés
                      </h3>
                    </div>
                    {sv?.idCheckResult && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Rögzítve
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    Kérd el szemrevételezésre az érdeklődő (<strong>{selectedViewing.requesterName}</strong>) érvényes
                    fényképes igazolványát (személyi igazolvány, útlevél vagy kártyás jogosítvány), és vesd össze a
                    nevét és arcképét.
                  </p>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950 flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Adatvédelmi szabály:</strong> Ne fotózd le az igazolványt, ne készíts róla másolatot, és
                      ne rögzíts okmányszámot, születési adatot vagy lakcímet. Az ILOLIT kizárólag az alábbi státuszt
                      tárolja.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ID_CHECK_RESULT_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition-colors ${
                          selectedIdOutcome === opt.value
                            ? "border-emerald-600 bg-emerald-50/70 text-slate-900 font-semibold"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="safevisit-id-check"
                          checked={selectedIdOutcome === opt.value}
                          onChange={() => setSelectedIdOutcome(opt.value)}
                          className="mt-0.5 accent-emerald-600"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={busyAction === "id-check"}
                    onClick={handleRecordIdCheck}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {busyAction === "id-check" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Ellenőrzés eredményének rögzítése
                  </button>
                </div>
              )}

              {/* Step 3: Arrival & Outcome recording */}
              {selectedViewing && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-emerald-700" />
                      <h3 className="text-sm font-bold text-slate-900">
                        {needsIdCheck ? "3." : "2."} Megérkezés rögzítése és megtekintés lezárása
                      </h3>
                    </div>
                    {sv?.arrivedAt && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Megérkezett: {new Date(sv.arrivedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {actionMessage && (
                    <div
                      className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                        actionMessage.type === "ok"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-rose-200 bg-rose-50 text-rose-900"
                      }`}
                    >
                      {actionMessage.text}
                    </div>
                  )}

                  {!sv?.outcome && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!canRecordArrival || busyAction === "arrival"}
                          onClick={handleRecordArrival}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-45 inline-flex items-center gap-1.5"
                        >
                          {busyAction === "arrival" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Megérkezés rögzítése
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-2.5">
                        <p className="text-xs font-semibold text-slate-700">
                          Megtekintés befejezése / kimenetel rögzítése (időbélyeggel):
                        </p>
                        <input
                          type="text"
                          value={outcomeNote}
                          onChange={(e) => setOutcomeNote(e.target.value)}
                          placeholder="Opcionális rövid megjegyzés (ne írj bele személyes okmányadatot)"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={Boolean(busyAction)}
                            onClick={() => handleRecordOutcome("COMPLETED")}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            Megtekintés befejezése
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busyAction)}
                            onClick={() => handleRecordOutcome("NO_SHOW")}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                          >
                            Nem jelent meg
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busyAction)}
                            onClick={() => handleRecordOutcome("DENIED_ENTRY")}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                          >
                            Megtekintés megtagadva
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busyAction)}
                            onClick={() => handleRecordOutcome("INTERRUPTED")}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                          >
                            Megtekintés megszakítva
                          </button>
                          <button
                            type="button"
                            onClick={() => onReportViewing(selectedViewing)}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 inline-flex items-center gap-1.5"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            Visszaélés jelentése
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {sv?.outcome && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        Lezárt állapot: <strong>{SAFEVISIT_STAGE_LABELS[sv.outcome]?.label || sv.outcome}</strong>
                        {sv.outcomeAt ? ` (${new Date(sv.outcomeAt).toLocaleString("hu-HU")})` : ""}
                      </div>
                      <button
                        type="button"
                        onClick={() => onReportViewing(selectedViewing)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Visszaélés jelentése
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: SECURITY SETTINGS */}
      {subTab === "settings" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Megtekintési biztonsági beállítások</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              A bekapcsolt feltételek átláthatóan megjelennek az ingatlan adatlapján az érdeklődők számára.
            </p>
          </div>

          <div className="space-y-3">
            {/* Mandatory baseline */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Ellenőrzött telefonszám</p>
                <p className="text-xs text-slate-600">
                  Minden érdeklődőnek SMS-ben ellenőrzött telefonszámmal kell rendelkeznie a foglaláshoz (kötelező alapvédelem).
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 shrink-0">
                Kötelező
              </span>
            </div>

            {/* Unique SafeVisit Code */}
            <label className="rounded-xl border border-slate-200 p-3.5 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50">
              <div>
                <p className="text-sm font-semibold text-slate-900">Egyedi megtekintési kód (ILOLIT SafeVisit)</p>
                <p className="text-xs text-slate-600">
                  Minden jóváhagyott megtekintéshez egyszer használatos 6 jegyű kód és QR-kód készül (alapdíj része).
                </p>
              </div>
              <input
                type="checkbox"
                checked={draftSettings.enableSafeVisitCode}
                onChange={(e) => setDraftSettings((s) => ({ ...s, enableSafeVisitCode: e.target.checked }))}
                className="mt-1 h-4 w-4 accent-emerald-600 shrink-0"
              />
            </label>

            {/* Photo ID on arrival */}
            <label className="rounded-xl border border-slate-200 p-3.5 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50">
              <div>
                <p className="text-sm font-semibold text-slate-900">Fényképes igazolvány bemutatása érkezéskor</p>
                <p className="text-xs text-slate-600">
                  Előzetesen tájékoztatja az érdeklődőt, hogy érkezéskor érvényes fényképes igazolvány
                  szemrevételezését kérheted (másolat vagy fotó nem készülhet).
                </p>
              </div>
              <input
                type="checkbox"
                checked={draftSettings.requirePhotoIdOnArrival}
                onChange={(e) => setDraftSettings((s) => ({ ...s, requirePhotoIdOnArrival: e.target.checked }))}
                className="mt-1 h-4 w-4 accent-emerald-600 shrink-0"
              />
            </label>

            {/* Companions disclosure */}
            <label className="rounded-xl border border-slate-200 p-3.5 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50">
              <div>
                <p className="text-sm font-semibold text-slate-900">Kísérők előzetes bejelentése</p>
                <p className="text-xs text-slate-600">
                  Az érdeklődőnek foglalás előtt kötelezően jeleznie kell, hány kísérővel érkezik.
                </p>
              </div>
              <input
                type="checkbox"
                checked={draftSettings.requireCompanionsDisclosure}
                onChange={(e) =>
                  setDraftSettings((s) => ({ ...s, requireCompanionsDisclosure: e.target.checked }))
                }
                className="mt-1 h-4 w-4 accent-emerald-600 shrink-0"
              />
            </label>

            {/* Agent exclusion */}
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
              <p className="text-sm font-semibold text-slate-900">Ingatlanközvetítői megkeresések kizárása</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setDraftPolicy("no_agents")}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-xs font-semibold border ${
                    draftPolicy === "no_agents"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Nem fogadok ingatlanközvetítői megkereséseket
                </button>
                <button
                  type="button"
                  onClick={() => setDraftPolicy("allow_agents")}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-xs font-semibold border ${
                    draftPolicy === "allow_agents"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Fogadok ingatlanközvetítői megkereséseket
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
            {settingsSavedMsg ? (
              <span className="text-xs font-medium text-emerald-800">{settingsSavedMsg}</span>
            ) : (
              <span className="text-xs text-slate-500">A beállítások bármikor módosíthatók.</span>
            )}
            <button
              type="button"
              disabled={savingSettings}
              onClick={handleSaveSettings}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Beállítások mentése
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: REOPENABLE SAFETY GUIDE */}
      {subTab === "guide" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <SafeVisitGuideContent />
        </div>
      )}

      {/* TAB 4: PAST & DOCUMENTED VIEWINGS */}
      {subTab === "history" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">Korábbi és dokumentált megtekintések</h3>
            <span className="text-xs text-slate-500">{pastOrProcessedViewings.length} bejegyzés</span>
          </div>

          {pastOrProcessedViewings.length === 0 ? (
            <p className="text-xs text-slate-600 py-4 text-center">
              Még nincs lezárt vagy ellenőrzött megtekintési esemény ehhez a hirdetéshez.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {pastOrProcessedViewings.map((v) => (
                <div key={v.id} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{v.requesterName}</span>
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5" />
                        {v.date} {v.startTime}
                      </span>
                      {v.safeVisit?.visitStage && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold">
                          {SAFEVISIT_STAGE_LABELS[v.safeVisit.visitStage]?.label || v.safeVisit.visitStage}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                      {v.safeVisit?.verifiedAt && (
                        <span>Kód ellenőrizve: {new Date(v.safeVisit.verifiedAt).toLocaleString("hu-HU")}</span>
                      )}
                      {v.safeVisit?.arrivedAt && (
                        <span>Megérkezés: {new Date(v.safeVisit.arrivedAt).toLocaleString("hu-HU")}</span>
                      )}
                      {v.safeVisit?.outcomeAt && (
                        <span>Lezárva: {new Date(v.safeVisit.outcomeAt).toLocaleString("hu-HU")}</span>
                      )}
                    </div>
                    {v.safeVisit?.outcomeNote && (
                      <p className="text-slate-500 italic">Megjegyzés: {v.safeVisit.outcomeNote}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onReportViewing(v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 shrink-0 self-start sm:self-center"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Visszaélés jelentése
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SafeVisitOwnerPanel;
