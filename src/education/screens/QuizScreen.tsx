import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Tile, Question } from "../data/questions";
import type { QuizResult } from "../App";
import { Heart, CheckCircle2, XCircle, Volume2, ArrowRight } from "lucide-react";

interface Props {
  tile: Tile;
  onComplete: (result: QuizResult) => void;
  onBack: () => void;
}

type AnswerState = "idle" | "correct" | "wrong";

export function QuizScreen({ tile, onComplete, onBack }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [correctCount, setCorrectCount] = useState(0);
  const [hearts, setHearts] = useState(5);

  const question: Question = tile.questions[currentIdx];
  const total = tile.questions.length;
  const progress = (currentIdx / total) * 100;

  const handleSelectOption = (optIdx: number) => {
    if (answerState !== "idle") return;
    setSelected(optIdx);
  };

  const handleCheck = useCallback(() => {
    if (selected === null || answerState !== "idle") return;
    const isCorrect = selected === question.correct;

    if (isCorrect) {
      setAnswerState("correct");
      setCorrectCount((c) => c + 1);
    } else {
      setAnswerState("wrong");
      setHearts((h) => Math.max(0, h - 1));
    }
  }, [selected, answerState, question.correct]);

  const handleContinue = useCallback(() => {
    if (currentIdx + 1 >= total || hearts <= 0) {
      onComplete({
        correct: correctCount,
        total,
        tile,
      });
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setAnswerState("idle");
    }
  }, [currentIdx, total, correctCount, hearts, tile, onComplete]);

  const isCorrect = answerState === "correct";
  const isWrong = answerState === "wrong";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between max-w-xl mx-auto font-sans">
      {/* Top Header Bar */}
      <div className="px-4 pt-4 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Progress Bar */}
          <div className="flex-1 h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              animate={{ width: `${progress + (1 / total) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Hearts Counter */}
          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3 py-1 rounded-full">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span className="font-black text-rose-600 dark:text-rose-400 text-xs">{hearts}</span>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 px-4 py-6 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Duolingo Tutor Mascot Speech Bubble */}
          <div className="flex items-start gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-500 text-3xl flex items-center justify-center flex-shrink-0 shadow-md">
              🦉
            </div>
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative flex-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {tile.category} • {currentIdx + 1}/{total}. Kérdés
              </div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                {question.question}
              </h2>
            </div>
          </div>

          {/* Multiple Choice Options Grid */}
          <div className="space-y-3">
            {question.options.map((opt, optIdx) => {
              const isOptionSelected = selected === optIdx;
              let btnStyle = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40";

              if (isOptionSelected && answerState === "idle") {
                btnStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-400";
              } else if (answerState === "correct" && optIdx === question.correct) {
                btnStyle = "border-emerald-500 bg-emerald-500 text-white font-black";
              } else if (answerState === "wrong" && isOptionSelected) {
                btnStyle = "border-rose-500 bg-rose-500 text-white font-black";
              } else if (answerState === "wrong" && optIdx === question.correct) {
                btnStyle = "border-emerald-500 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-bold";
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={answerState !== "idle"}
                  className={`w-full p-4 rounded-2xl border-2 border-b-4 text-left font-extrabold text-sm md:text-base transition-all active:translate-y-0.5 flex items-center justify-between shadow-2xs ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      {optIdx + 1}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {isOptionSelected && answerState === "idle" && (
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Bar / Bottom Drawer */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800">
          {answerState === "idle" ? (
            <button
              type="button"
              onClick={handleCheck}
              disabled={selected === null}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider border-b-4 transition-all shadow-md active:translate-y-1 ${
                selected !== null
                  ? "bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-600 cursor-pointer"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed"
              }`}
            >
              ELLENŐRZÉS
            </button>
          ) : (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`p-5 rounded-3xl border-2 ${
                isCorrect
                  ? "bg-emerald-500 border-emerald-600 text-white"
                  : "bg-rose-500 border-rose-600 text-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="w-8 h-8 text-white fill-emerald-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-white fill-rose-600" />
                  )}
                  <div>
                    <h3 className="font-black text-lg">
                      {isCorrect ? "Kiváló! Helyes válasz!" : "Helytelen válasz!"}
                    </h3>
                    <p className="text-xs opacity-90 font-medium">
                      {isCorrect ? "+15 XP megszervezve! 🔥" : `Helyes megoldás: ${question.options[question.correct]}`}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                className="w-full py-3.5 rounded-2xl bg-white text-slate-900 font-black text-xs uppercase tracking-wider hover:bg-slate-100 active:translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>FOLYTATÁS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
