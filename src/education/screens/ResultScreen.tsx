import { motion } from "framer-motion";
import type { QuizResult } from "../App";
import { Flame, Trophy, Zap, Gem, RotateCcw, ArrowRight, Sparkles } from "lucide-react";

interface Props {
  result: QuizResult;
  xp: number;
  streak: number;
  onContinue: () => void;
  onRetry: () => void;
  onContinueWithFile?: () => void;
}

function StarRating({ correct, total }: { correct: number; total: number }) {
  const ratio = correct / total;
  const stars = ratio === 1 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;

  return (
    <div className="flex items-center justify-center gap-3 my-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 300 }}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-md border-b-4 ${
            i < stars
              ? "bg-amber-400 border-amber-600 text-amber-950"
              : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 opacity-40 grayscale"
          }`}
        >
          ⭐
        </motion.div>
      ))}
    </div>
  );
}

export function ResultScreen({ result, xp, streak, onContinue, onRetry, onContinueWithFile }: Props) {
  const { correct, total, tile } = result;
  const percent = Math.round((correct / total) * 100);
  const isPerfect = correct === total;
  const isGood = correct >= Math.ceil(total * 0.6);
  const earnedXp = correct * 15;
  const earnedGems = isPerfect ? 20 : 10;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 max-w-xl mx-auto font-sans">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="w-24 h-24 rounded-3xl bg-amber-400 border-b-8 border-amber-600 text-6xl flex items-center justify-center shadow-xl mb-4"
      >
        {isPerfect ? "🏆" : isGood ? "🎉" : "💪"}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 text-center"
      >
        {isPerfect ? "TÖKÉLETES LECKE!" : isGood ? "SZÉP MUNKA!" : "KITARTÁS! PRÓBÁLD ÚJRA!"}
      </motion.h1>

      <StarRating correct={correct} total={total} />

      {/* Gamified Rewards Card Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full grid grid-cols-3 gap-3 my-6"
      >
        {/* XP Card */}
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-200 dark:border-amber-800 text-center shadow-2xs">
          <Zap className="w-5 h-5 text-amber-500 fill-amber-500 mx-auto mb-1" />
          <div className="text-base font-black text-amber-600 dark:text-amber-400">+{earnedXp} XP</div>
          <div className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase">SZERZETT XP</div>
        </div>

        {/* Streak Card */}
        <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/60 border-2 border-orange-200 dark:border-orange-800 text-center shadow-2xs">
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500 mx-auto mb-1 animate-pulse" />
          <div className="text-base font-black text-orange-600 dark:text-orange-400">{streak} NAP</div>
          <div className="text-[10px] font-extrabold text-orange-800 dark:text-orange-300 uppercase">NAPI SZÉRIA</div>
        </div>

        {/* Gems Card */}
        <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border-2 border-sky-200 dark:border-sky-800 text-center shadow-2xs">
          <span className="text-base block mb-0.5">💎</span>
          <div className="text-base font-black text-sky-600 dark:text-sky-400">+{earnedGems}</div>
          <div className="text-[10px] font-extrabold text-sky-800 dark:text-sky-300 uppercase">DRÁGAKŐ</div>
        </div>
      </motion.div>

      {/* Accuracy & Correct Answers */}
      <div className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-6 shadow-xs flex items-center justify-between">
        <span className="text-xs font-black text-slate-500 uppercase">PONTOSSÁG</span>
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{percent}% ({correct}/{total} Helyes)</span>
      </div>

      {/* Buttons */}
      <div className="w-full space-y-3">
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm uppercase tracking-wider border-b-4 border-emerald-700 hover:bg-emerald-600 active:translate-y-1 transition-all shadow-md flex items-center justify-center gap-2"
        >
          <span>KÖVETKEZŐ SZINT</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onRetry}
          className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>ÚJRA PRÓBÁLOM</span>
        </button>
      </div>
    </div>
  );
}
