import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AgeSelectScreen } from "./screens/AgeSelectScreen";
import { QuizPathScreen } from "./screens/QuizPathScreen";
import { QuizScreen } from "./screens/QuizScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { CustomQuizScreen } from "./screens/CustomQuizScreen";
import { MathScreen } from "./screens/MathScreen";
import { LearningProfileSection } from "./components/LearningProfileSection";
import { PersonalizedRecommendation } from "./components/PersonalizedRecommendation";
import { ParentTeacherDashboard } from "./components/ParentTeacherDashboard";
import type { AgeGroup, Tile, Question } from "./data/questions";

export type AppStep = "age" | "path" | "custom" | "loading" | "quiz" | "result" | "continue-loading";

export interface QuizResult {
  correct: number;
  total: number;
  tile: Tile;
}

interface ApiQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

async function fetchQuizFromApi(topic: string, topicTitle: string): Promise<Question[]> {
  const res = await fetch("/api/learn/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, topicTitle }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json() as { questions: ApiQuestion[] };
  return data.questions.map((q) => ({
    question: q.question,
    options: q.options,
    correct: q.correctIndex,
    explanation: q.explanation,
  }));
}

export default function App() {
  const [step, setStep] = useState<AppStep>("age");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("kids");
  const [activeTile, setActiveTile] = useState<Tile | null>(null);
  const [completedTiles, setCompletedTiles] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<QuizResult | null>(null);
  const [xp, setXp] = useState(140);
  const [streak, setStreak] = useState(5);
  const [hearts, setHearts] = useState(5);
  const [gems, setGems] = useState(120);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [quizSource, setQuizSource] = useState<"path" | "custom">("path");
  const [savedFile, setSavedFile] = useState<File | null>(null);
  const [savedTopic, setSavedTopic] = useState<string>("");

  const handleAgeSelect = useCallback((age: AgeGroup) => {
    setAgeGroup(age);
    setCompletedTiles(new Set());
    setXp(140);
    setStreak(5);
    setHearts(5);
    setGems(120);
    setStep("path");
  }, []);

  const handleGoToCustom = useCallback(() => {
    setStep("custom");
  }, []);

  const handleCustomQuizComplete = useCallback((tile: Tile, file: File | null, topic: string) => {
    setActiveTile(tile);
    setQuizSource("custom");
    setSavedFile(file);
    setSavedTopic(topic);
    setStep("quiz");
  }, []);

  const handleTileSelect = useCallback(async (tile: Tile) => {
    if (tile.apiTopic && tile.apiTopicTitle) {
      setActiveTile(tile);
      setLoadingError(null);
      setQuizSource("path");
      setStep("loading");
      try {
        const questions = await fetchQuizFromApi(tile.apiTopic, tile.apiTopicTitle);
        setActiveTile({ ...tile, questions });
        setStep("quiz");
      } catch {
        setLoadingError("Nem sikerült betölteni a kvízt. Próbáld újra!");
        setStep("path");
      }
    } else {
      setActiveTile(tile);
      setQuizSource("path");
      setStep("quiz");
    }
  }, []);

  const handleQuizComplete = useCallback(
    (result: QuizResult) => {
      setLastResult(result);
      if (result.correct > 0) {
        setCompletedTiles((prev) => new Set([...prev, result.tile.id]));
        setXp((prev) => prev + result.correct * 15);
        setGems((prev) => prev + 10);
        setStreak((prev) => (result.correct === result.total ? prev + 1 : prev));
      }
      setStep("result");
    },
    []
  );


  const handleBackToPath = useCallback(() => {
    setActiveTile(null);
    setLastResult(null);
    setLoadingError(null);
    setStep(quizSource === "custom" ? "custom" : "path");
  }, [quizSource]);

  const handleContinueWithFile = useCallback(async () => {
    if (!savedFile || !savedTopic) return;
    setLastResult(null);
    setLoadingError(null);
    setStep("continue-loading");
    try {
      const form = new FormData();
      form.append("topic", savedTopic);
      form.append("file", savedFile);
      form.append("mixed", "1");
      const res = await fetch("/api/learn/custom-quiz", { method: "POST", body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { questions?: ApiQuestion[]; error?: string };
      if (data.error || !data.questions?.length) throw new Error(data.error ?? "No questions");
      const questions = data.questions.map((q) => ({
        question: q.question,
        options: q.options,
        correct: q.correctIndex,
        explanation: q.explanation,
      }));
      const mixedTile: import("./data/questions").Tile = {
        id: `mixed-${Date.now()}`,
        emoji: "🚀",
        category: savedTopic,
        color: "#059669",
        shadow: "#047857",
        questions,
      };
      setActiveTile(mixedTile);
      setStep("quiz");
    } catch {
      setLoadingError("Nem sikerült a folytatást betölteni. Próbáld újra!");
      setStep("result");
    }
  }, [savedFile, savedTopic]);

  const handleRestart = useCallback(() => {
    setActiveTile(null);
    setLastResult(null);
    setLoadingError(null);
    setCompletedTiles(new Set());
    setXp(0);
    setStreak(0);
    setStep("age");
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <AnimatePresence mode="wait">
        {step === "age" && (
          <motion.div
            key="age"
            className="w-full"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.3 }}
          >
            <AgeSelectScreen onSelect={handleAgeSelect} onCustomQuiz={handleGoToCustom} />
          </motion.div>
        )}

        {step === "custom" && (
          <motion.div
            key="custom"
            className="w-full"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.32 }}
          >
            <CustomQuizScreen
              onComplete={handleCustomQuizComplete}
              onBack={() => setStep("age")}
            />
          </motion.div>
        )}

        {step === "path" && ageGroup === "math4" && (
          <motion.div
            key="math4"
            className="w-full"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.32 }}
          >
            <MathScreen onBack={handleRestart} />
          </motion.div>
        )}

        {step === "path" && ageGroup !== "math4" && (
          <motion.div
            key="path"
            className="w-full space-y-6"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.32 }}
          >
            {/* Tanulási Profil (Feature 25) */}
            <LearningProfileSection
              xp={xp}
              streak={streak}
              completedCount={completedTiles.size}
              totalTasksCount={24}
            />

            {/* Személyre szabott tanulási útvonal ajánló (Feature 26) */}
            <PersonalizedRecommendation
              recentAccuracyPercent={lastResult ? Math.round((lastResult.correct / lastResult.total) * 100) : 78}
              onStartRecommendedQuiz={(topicId) => {
                alert(`Indítjuk a személyre szabott ${topicId} kvízt!`);
              }}
            />

            {/* Fő Kvíz Útvonal Térkép */}
            <QuizPathScreen
              ageGroup={ageGroup}
              completedTiles={completedTiles}
              xp={xp}
              streak={streak}
              onTileSelect={handleTileSelect}
              onRestart={handleRestart}
              errorMessage={loadingError}
            />

            {/* Szülői / Pedagógus Nézet (Feature 27) */}
            <ParentTeacherDashboard />
          </motion.div>
        )}

        {step === "loading" && activeTile && (
          <motion.div
            key="loading"
            className="w-full min-h-screen flex flex-col items-center justify-center gap-6 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-xl"
              style={{ background: `${activeTile.color}22`, border: `3px solid ${activeTile.color}` }}
            >
              {activeTile.emoji}
            </div>
            <div className="text-center">
              <div className="font-black text-xl text-foreground mb-2">{activeTile.category}</div>
              <p className="text-muted-foreground font-medium text-sm">AI kvíz generálása folyamatban…</p>
            </div>
            <motion.div
              className="flex gap-2"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{ background: activeTile.color, animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}

        {step === "quiz" && activeTile && activeTile.questions.length > 0 && (
          <motion.div
            key="quiz"
            className="w-full"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.3 }}
          >
            <QuizScreen
              tile={activeTile}
              onComplete={handleQuizComplete}
              onBack={handleBackToPath}
            />
          </motion.div>
        )}

        {step === "continue-loading" && (
          <motion.div
            key="continue-loading"
            className="w-full min-h-screen flex flex-col items-center justify-center gap-6 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-xl bg-emerald-50 border-3 border-emerald-500">
              🚀
            </div>
            <div className="text-center">
              <div className="font-black text-xl text-foreground mb-2">Továbblépünk!</div>
            </div>
            <motion.div
              className="flex gap-2"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-3 h-3 rounded-full bg-emerald-500" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </motion.div>
          </motion.div>
        )}

        {step === "result" && lastResult && (
          <motion.div
            key="result"
            className="w-full"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.32 }}
          >
            <ResultScreen
              result={lastResult}
              xp={xp}
              streak={streak}
              onContinue={handleBackToPath}
              onRetry={() => {
                setLastResult(null);
                setStep("quiz");
              }}
              onContinueWithFile={
                quizSource === "custom" && savedFile
                  ? () => { void handleContinueWithFile(); }
                  : undefined
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
