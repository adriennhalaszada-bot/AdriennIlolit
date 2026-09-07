import { motion, AnimatePresence } from "framer-motion";
import { TILES } from "../data/questions";
import type { AgeGroup, Tile } from "../data/questions";
import { Sparkles, Flame, Heart, Zap, Lock, Star, Trophy, RotateCcw, Award } from "lucide-react";

const AGE_LABELS: Record<AgeGroup, string> = {
  kids: "Mini Hacker (5-12 év) 🦊",
  teens: "Digitális Bennszülött (13-18 év) 🦋",
  adults: "Mesteri Tanuló (Felnőtt) 🦉",
  math4: "Matematika 4. osztály 📐",
};

interface Props {
  ageGroup: AgeGroup;
  completedTiles: Set<string>;
  xp: number;
  streak: number;
  hearts?: number;
  gems?: number;
  onTileSelect: (tile: Tile) => void;
  onRestart: () => void;
  errorMessage?: string | null;
}

const PATH_POSITIONS = [
  "translate-x-0",
  "translate-x-12 md:translate-x-20",
  "translate-x-24 md:translate-x-36",
  "translate-x-12 md:translate-x-20",
  "translate-x-0",
  "-translate-x-12 md:-translate-x-20",
  "-translate-x-24 md:-translate-x-36",
  "-translate-x-12 md:-translate-x-20",
];

export function QuizPathScreen({
  ageGroup,
  completedTiles,
  xp = 140,
  streak = 5,
  hearts = 5,
  gems = 120,
  onTileSelect,
  onRestart,
  errorMessage,
}: Props) {
  const allTiles = TILES[ageGroup];
  const regularTiles = allTiles.filter((t) => !t.apiTopic);
  const dwTiles = allTiles.filter((t) => !!t.apiTopic);
  const allRegularDone = regularTiles.every((t) => completedTiles.has(t.id));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans pb-16">
      {/* Duolingo Top Stats Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <button
            onClick={onRestart}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors font-extrabold text-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Kijelentkezés</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Streak */}
            <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-3 py-1 rounded-full shadow-2xs">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
              <span className="font-black text-orange-600 dark:text-orange-400 text-xs">{streak} NAP</span>
            </div>

            {/* Gems */}
            <div className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-3 py-1 rounded-full shadow-2xs">
              <span className="text-xs">💎</span>
              <span className="font-black text-sky-600 dark:text-sky-400 text-xs">{gems}</span>
            </div>

            {/* Hearts */}
            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3 py-1 rounded-full shadow-2xs">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span className="font-black text-rose-600 dark:text-rose-400 text-xs">{hearts}</span>
            </div>

            {/* XP */}
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full shadow-2xs">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-black text-amber-600 dark:text-amber-400 text-xs">{xp} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Path Content */}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 pt-6 pb-12 flex flex-col items-center">
        {/* Unit 1 Header */}
        <div className="w-full bg-emerald-600 text-white rounded-3xl p-5 mb-8 shadow-lg border-b-4 border-emerald-800 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-200 bg-emerald-700/60 px-3 py-1 rounded-full">
                1. SZAKASZ • ILOLIT AKADÉMIA
              </span>

              <h2 className="text-xl font-black mt-2 text-white">{AGE_LABELS[ageGroup]}</h2>
              <p className="text-xs text-emerald-100 mt-1 font-medium">Gyűjts csillagokat és tartsd életben a szériádat!</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30">
              🏆
            </div>
          </div>
        </div>

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full mb-6 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-700 p-4 text-xs font-black flex items-center gap-2 shadow-xs"
            >
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {allRegularDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full mb-8 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-emerald-600 text-white p-6 text-center shadow-xl border-b-4 border-amber-700"
          >
            <div className="text-6xl mb-2 animate-bounce">🏆</div>
            <div className="font-black text-2xl">SZAKASZ TELJESÍTVE!</div>
            <div className="text-xs mt-1 font-bold text-amber-100">Összesített XP: {xp} • Napi Széria: {streak} nap 🔥</div>
            <button
              onClick={onRestart}
              className="mt-4 bg-white text-orange-600 font-black px-8 py-3 rounded-2xl text-xs hover:bg-orange-50 active:translate-y-1 transition-all shadow-md uppercase tracking-wider"
            >
              Újraindítás
            </button>
          </motion.div>
        )}

        {/* Duolingo Winding Node Path */}
        <div className="flex flex-col items-center w-full py-4 space-y-6">
          {regularTiles.map((tile, idx) => {
            const isCompleted = completedTiles.has(tile.id);
            const isCurrent = !isCompleted && (idx === 0 || completedTiles.has(regularTiles[idx - 1].id));
            const isLocked = !isCompleted && !isCurrent;
            const posClass = PATH_POSITIONS[idx % PATH_POSITIONS.length];

            return (
              <div key={tile.id} className={`flex flex-col items-center transition-transform ${posClass}`}>
                {/* Speech bubble indicator for current active node */}
                {isCurrent && (
                  <motion.div
                    initial={{ y: -6 }}
                    animate={{ y: 0 }}
                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
                    className="mb-2 bg-emerald-500 text-white font-black text-[11px] px-3 py-1 rounded-full shadow-md border-b-2 border-emerald-700 uppercase tracking-wider relative flex items-center gap-1"
                  >
                    <span>START</span>
                    <Sparkles className="w-3 h-3 text-yellow-300" />
                  </motion.div>
                )}

                <button
                  onClick={() => !isLocked && onTileSelect(tile)}
                  disabled={isLocked}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black transition-all relative ${
                    isCompleted
                      ? "bg-amber-400 text-amber-950 border-b-8 border-amber-600 shadow-md active:translate-y-1 active:border-b-2"
                      : isCurrent
                      ? "bg-emerald-500 text-white border-b-8 border-emerald-700 shadow-xl ring-4 ring-emerald-300 dark:ring-emerald-800 active:translate-y-1 active:border-b-2 scale-105"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400 border-b-8 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-75"
                  }`}
                  style={{
                    backgroundColor: isCompleted ? "#f59e0b" : isCurrent ? tile.color : undefined,
                    borderColor: isCompleted ? "#b45309" : isCurrent ? tile.shadow : undefined,
                  }}
                >
                  {isLocked ? (
                    <Lock className="w-8 h-8 text-slate-400" />
                  ) : isCompleted ? (
                    <div className="flex flex-col items-center">
                      <span>{tile.emoji}</span>
                      <div className="absolute -bottom-2 flex gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-500" />
                        <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-500" />
                        <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-500" />
                      </div>
                    </div>
                  ) : (
                    <span>{tile.emoji}</span>
                  )}
                </button>

                <div className="mt-2 text-center">
                  <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{tile.category}</div>
                  <div className="text-[10px] font-bold text-slate-500">{tile.questions.length} Kérdés</div>
                </div>
              </div>
            );
          })}

          {/* AI Generator Bonus Nodes */}
          {dwTiles.length > 0 && (
            <div className="w-full mt-10 pt-6 border-t-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <div className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>AI KÍVÁNSÁG & EGYEDI KVIZEK</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {dwTiles.map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => onTileSelect(tile)}
                    className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-left font-black shadow-md border-b-4 border-indigo-800 hover:brightness-110 active:translate-y-1 transition-all flex items-center gap-3"
                  >
                    <span className="text-3xl p-2 rounded-xl bg-white/20">{tile.emoji}</span>
                    <div>
                      <div className="text-sm">{tile.category}</div>
                      <div className="text-[11px] text-indigo-100 font-medium">Automatikus AI feladatsor</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
