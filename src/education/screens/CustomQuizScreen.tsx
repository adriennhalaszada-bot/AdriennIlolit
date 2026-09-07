import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { Question, Tile } from "../data/questions";

interface Props {
  onComplete: (tile: Tile, file: File | null, topic: string) => void;
  onBack: () => void;
}

interface ApiQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp", "text/html"];

export function CustomQuizScreen({ onComplete, onBack }: Props) {
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Csak PDF, JPG, PNG vagy HTML fájl tölthető fel.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("A fájl maximális mérete 20 MB.");
      return;
    }
    setFile(f);
    setError(null);
    // Auto-fill topic from filename (strip extension) if topic is still empty
    setTopic((prev) => {
      if (prev.trim()) return prev;
      return f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const doFetch = async (attempt: number): Promise<{ questions?: ApiQuestion[]; error?: string }> => {
    const form = new FormData();
    form.append("topic", topic.trim());
    if (file) form.append("file", file);

    // 14-second client timeout — safely under the ~15s proxy limit.
    // On timeout the server usually finishes anyway and writes to cache,
    // so the retry (attempt 2) will be served from cache almost instantly.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14_000);

    try {
      const res = await fetch("/api/learn/custom-quiz", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return (await res.json()) as { questions?: ApiQuestion[]; error?: string };
    } catch (err) {
      clearTimeout(timer);
      if ((err as { name?: string }).name === "AbortError" && attempt < 2) {
        // First attempt timed out. Server likely completed and cached the result.
        // Wait a moment for the cache write, then retry.
        await new Promise((r) => setTimeout(r, 1500));
        return doFetch(attempt + 1);
      }
      throw err;
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Írd be a téma nevét!");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const data = await doFetch(1);

      if (data.error) {
        setError(data.error);
        return;
      }

      const questions: Question[] = (data.questions ?? []).map((q) => ({
        question: q.question,
        options: q.options,
        correct: q.correctIndex,
        explanation: q.explanation,
      }));

      if (questions.length === 0) {
        setError("Az AI nem tudott kérdéseket generálni. Próbálj más témát!");
        return;
      }

      const syntheticTile: Tile = {
        id: `custom-${Date.now()}`,
        emoji: "✨",
        category: topic.trim(),
        color: "#7c3aed",
        shadow: "#5b21b6",
        questions,
      };

      onComplete(syntheticTile, file, topic.trim());
    } catch {
      setError("Nem sikerült csatlakozni a szerverhez. Ellenőrizd az internetkapcsolatot!");
    } finally {
      setLoading(false);
    }
  };

  const fileIcon = file
    ? file.type === "application/pdf"
      ? "📄"
      : file.type === "text/html"
        ? "🌐"
        : "🖼️"
    : null;

  const fileLabel = file
    ? file.type === "application/pdf"
      ? "PDF dokumentum"
      : file.type === "text/html"
        ? "HTML fájl"
        : "Kép"
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Vissza
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✨</div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Saját Kvíz</h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium leading-relaxed">
            Írd be a témát, és opcionálisan tölts fel PDF-et vagy képet —<br />
            az AI megcsinálja a kvízt belőle
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Téma neve <span className="text-violet-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) void handleGenerate(); }}
              placeholder="pl. Fotoszintézis, II. Világháború, Python..."
              disabled={loading}
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm font-medium focus:border-violet-500 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Anyag feltöltése{" "}
              <span className="text-muted-foreground font-medium">(nem kötelező)</span>
            </label>
            <div
              role="button"
              tabIndex={0}
              className={[
                "relative border-2 border-dashed rounded-xl p-7 text-center transition-all cursor-pointer select-none",
                isDragging
                  ? "border-violet-500 bg-violet-50 scale-[1.01]"
                  : "border-border hover:border-violet-400 hover:bg-violet-50/30",
                loading ? "pointer-events-none opacity-50" : "",
              ].join(" ")}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.html,.htm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />

              {file ? (
                <div className="flex items-center gap-3 justify-center">
                  <span className="text-3xl">{fileIcon}</span>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB · {fileLabel}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="w-7 h-7 rounded-full bg-muted hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-muted-foreground transition-colors shrink-0 text-lg leading-none"
                    aria-label="Fájl eltávolítása"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📎</div>
                  <div className="text-sm font-semibold text-foreground">PDF, JPG, PNG vagy HTML</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Húzd ide, vagy kattints a kiválasztáshoz · max. 20 MB
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium flex items-start gap-2"
            >
              <span className="mt-0.5 shrink-0">⚠️</span>
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            onClick={() => { void handleGenerate(); }}
            disabled={loading || !topic.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-lg shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  ⚙️
                </motion.span>
                Generálás folyamatban…
              </span>
            ) : (
              "✨ Kvíz generálása"
            )}
          </motion.button>

          {loading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs text-muted-foreground font-medium leading-relaxed"
            >
              {file
                ? "Az anyag elemzése és a kérdések generálása 10–20 másodpercet vehet igénybe…"
                : "Az AI kérdések generálása 5–8 másodpercet vesz igénybe…"}
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
