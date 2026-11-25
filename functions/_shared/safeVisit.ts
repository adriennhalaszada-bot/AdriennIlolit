// ILOLIT SafeVisit — Cryptographic 6-digit code, QR verification token,
// AES-256-GCM at-rest encryption, configurable time-window & atomic verification helpers.
// Privacy-by-design: NEVER stores ID photos, ID numbers, birth dates, or personal data inside QR tokens.

export interface SafeVisitEnv {
  CLERK_SECRET_KEY?: string;
  SAFEVISIT_SECRET?: string;
  SAFEVISIT_WINDOW_BEFORE_MIN?: string;
  SAFEVISIT_WINDOW_AFTER_MIN?: string;
}

export type SafeVisitCodeStatus = "ACTIVE" | "USED" | "INVALIDATED";
export type SafeVisitIdCheckResult = "MATCHED" | "NOT_SHOWN" | "MISMATCH" | "DENIED_SAFETY";
export type SafeVisitStage =
  | "SCHEDULED"
  | "CODE_VERIFIED"
  | "ARRIVED_IN_PROGRESS"
  | "COMPLETED"
  | "NO_SHOW"
  | "DENIED_ENTRY"
  | "INTERRUPTED";

export interface StoredSafeVisitRecord {
  codeStatus: SafeVisitCodeStatus;
  codeHash: string;
  qrTokenHash: string;
  encryptedCode: string;
  encryptedQrToken: string;
  validFrom: string;
  validUntil: string;
  windowBeforeMinutes: number;
  windowAfterMinutes: number;
  failedAttempts: number;
  lockedUntil: string | null;
  verifiedAt: string | null;
  usedAt: string | null;
  verifiedMethod?: "manual_code" | "qr_token";
  idCheckRequired: boolean;
  idCheckResult: SafeVisitIdCheckResult | null;
  idCheckAt: string | null;
  visitStage: SafeVisitStage;
  arrivedAt: string | null;
  outcome: "COMPLETED" | "NO_SHOW" | "DENIED_ENTRY" | "INTERRUPTED" | null;
  outcomeAt: string | null;
  outcomeNote?: string | null;
  createdAt: string;
  invalidatedAt?: string | null;
}

export const DEFAULT_SAFEVISIT_BEFORE_MIN = 30;
export const DEFAULT_SAFEVISIT_AFTER_MIN = 60;
export const MAX_FAILED_VERIFY_ATTEMPTS = 5;
export const VERIFY_LOCKOUT_MS = 15 * 60_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(str.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Generates a cryptographically secure random 6-digit numeric viewing code (100000 - 999999).
 */
export function generateSafeVisitCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const num = 100000 + (arr[0] % 900000);
  return String(num);
}

/**
 * Generates an opaque, random, time-limited QR verification token containing ZERO personal data.
 */
export function generateSafeVisitQrToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `sv_${bytesToBase64Url(bytes)}`;
}

async function deriveAesKey(env: SafeVisitEnv): Promise<CryptoKey> {
  const material = env.SAFEVISIT_SECRET || env.CLERK_SECRET_KEY || "ilolit-safevisit-fallback-key";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ilolit-safevisit-aes:${material}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptSafeVisitSecret(env: SafeVisitEnv, plaintext: string): Promise<string> {
  const key = await deriveAesKey(env);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(cipher))}`;
}

export async function decryptSafeVisitSecret(env: SafeVisitEnv, payload: string): Promise<string | null> {
  try {
    const parts = String(payload || "").split(".");
    if (parts.length !== 3 || parts[0] !== "v1") return null;
    const key = await deriveAesKey(env);
    const iv = base64UrlToBytes(parts[1]);
    const data = base64UrlToBytes(parts[2]);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      data as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export function getWindowConfig(env: SafeVisitEnv): { beforeMin: number; afterMin: number } {
  const beforeParsed = Number(env.SAFEVISIT_WINDOW_BEFORE_MIN);
  const afterParsed = Number(env.SAFEVISIT_WINDOW_AFTER_MIN);
  const beforeMin =
    Number.isFinite(beforeParsed) && beforeParsed >= 5 && beforeParsed <= 720
      ? Math.round(beforeParsed)
      : DEFAULT_SAFEVISIT_BEFORE_MIN;
  const afterMin =
    Number.isFinite(afterParsed) && afterParsed >= 15 && afterParsed <= 1440
      ? Math.round(afterParsed)
      : DEFAULT_SAFEVISIT_AFTER_MIN;
  return { beforeMin, afterMin };
}

/**
 * Computes validity window around a viewing slot (default: 30 min before start .. 60 min after planned end).
 * Uses Budapest/CET-aware tolerance if timezone isn't attached to YYYY-MM-DD HH:mm.
 */
export function computeSafeVisitWindow(
  date: string,
  startTime: string,
  endTime: string,
  beforeMin = DEFAULT_SAFEVISIT_BEFORE_MIN,
  afterMin = DEFAULT_SAFEVISIT_AFTER_MIN,
): { validFrom: string; validUntil: string } {
  const startIso = `${date}T${startTime || "12:00"}:00+01:00`;
  const endIso = `${date}T${endTime || startTime || "12:30"}:00+01:00`;
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const safeStart = Number.isFinite(startMs) ? startMs : Date.now();
  const safeEnd = Number.isFinite(endMs) && endMs >= safeStart ? endMs : safeStart + 30 * 60_000;
  return {
    validFrom: new Date(safeStart - beforeMin * 60_000).toISOString(),
    validUntil: new Date(safeEnd + afterMin * 60_000).toISOString(),
  };
}

export async function createSafeVisitCredentials(
  env: SafeVisitEnv,
  params: {
    viewingId: string;
    date: string;
    startTime: string;
    endTime: string;
    idCheckRequired: boolean;
  },
): Promise<{ record: StoredSafeVisitRecord; plainCode: string; plainQrToken: string }> {
  const plainCode = generateSafeVisitCode();
  const plainQrToken = generateSafeVisitQrToken();
  const { beforeMin, afterMin } = getWindowConfig(env);
  const { validFrom, validUntil } = computeSafeVisitWindow(
    params.date,
    params.startTime,
    params.endTime,
    beforeMin,
    afterMin,
  );
  const [codeHash, qrTokenHash, encryptedCode, encryptedQrToken] = await Promise.all([
    sha256Hex(`sv-code:${params.viewingId}:${plainCode}`),
    sha256Hex(`sv-qr:${params.viewingId}:${plainQrToken}`),
    encryptSafeVisitSecret(env, plainCode),
    encryptSafeVisitSecret(env, plainQrToken),
  ]);

  const record: StoredSafeVisitRecord = {
    codeStatus: "ACTIVE",
    codeHash,
    qrTokenHash,
    encryptedCode,
    encryptedQrToken,
    validFrom,
    validUntil,
    windowBeforeMinutes: beforeMin,
    windowAfterMinutes: afterMin,
    failedAttempts: 0,
    lockedUntil: null,
    verifiedAt: null,
    usedAt: null,
    idCheckRequired: params.idCheckRequired,
    idCheckResult: null,
    idCheckAt: null,
    visitStage: "SCHEDULED",
    arrivedAt: null,
    outcome: null,
    outcomeAt: null,
    outcomeNote: null,
    createdAt: new Date().toISOString(),
  };

  return { record, plainCode, plainQrToken };
}

export function sanitizeSafeVisitForList(sv?: StoredSafeVisitRecord | null) {
  if (!sv) return undefined;
  return {
    codeStatus: sv.codeStatus,
    validFrom: sv.validFrom,
    validUntil: sv.validUntil,
    windowBeforeMinutes: sv.windowBeforeMinutes,
    windowAfterMinutes: sv.windowAfterMinutes,
    verifiedAt: sv.verifiedAt,
    usedAt: sv.usedAt,
    verifiedMethod: sv.verifiedMethod,
    idCheckRequired: sv.idCheckRequired,
    idCheckResult: sv.idCheckResult,
    idCheckAt: sv.idCheckAt,
    visitStage: sv.visitStage,
    arrivedAt: sv.arrivedAt,
    outcome: sv.outcome,
    outcomeAt: sv.outcomeAt,
    outcomeNote: sv.outcomeNote,
  };
}

export function checkSafeVisitVerificationEligibility(
  viewingStatus: string,
  sv: StoredSafeVisitRecord | null | undefined,
  nowMs = Date.now(),
  bypassTimeWindowForTest = false,
): { ok: true } | { ok: false; reason: "not_approved" | "missing" | "invalidated" | "used" | "locked" | "expired" | "too_early" } {
  if (viewingStatus !== "APPROVED") return { ok: false, reason: "not_approved" };
  if (!sv) return { ok: false, reason: "missing" };
  if (sv.codeStatus === "INVALIDATED") return { ok: false, reason: "invalidated" };
  if (sv.codeStatus === "USED" || sv.usedAt) return { ok: false, reason: "used" };
  if (sv.lockedUntil && new Date(sv.lockedUntil).getTime() > nowMs) return { ok: false, reason: "locked" };

  if (!bypassTimeWindowForTest) {
    const fromMs = new Date(sv.validFrom).getTime();
    const untilMs = new Date(sv.validUntil).getTime();
    if (Number.isFinite(fromMs) && nowMs < fromMs) return { ok: false, reason: "too_early" };
    if (Number.isFinite(untilMs) && nowMs > untilMs) return { ok: false, reason: "expired" };
  }
  return { ok: true };
}
