import { motion } from "framer-motion";
import type { AgeGroup } from "../data/questions";

interface AgeOption {
  id: AgeGroup;
  label: string;
  sub: string;
  emoji: string;
  gradient: string;
  border: string;
}

const OPTIONS: AgeOption[] = [
  {
    id: "kids",
    label: "Mini Hacker",
    sub: "5–12 éves",
    emoji: "🦊",
    gradient: "from-green-400 to-emerald-500",
    border: "border-green-500",
  },
  {
    id: "teens",
    label: "Digitális Bennszülött",
    sub: "13–18 éves",
    emoji: "🦋",
    gradient: "from-sky-400 to-blue-500",
    border: "border-sky-500",
  },
  {
    id: "adults",
    label: "Legenda",
    sub: "18+ éves",
    emoji: "🦉",
    gradient: "from-violet-500 to-purple-600",
    border: "border-violet-500",
  },
];

const MATH_OPTION: AgeOption = {
  id: "math4",
  label: "Matematika 4. osztály",
  sub: "Számok, kerekítés, helyiértékek",
  emoji: "📐",
  gradient: "from-yellow-400 to-orange-500",
  border: "border-yellow-500",
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.92 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

export function AgeSelectScreen({
  onSelect,
  onCustomQuiz,
}: {
  onSelect: (age: AgeGroup) => void;
  onCustomQuiz?: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="text-center mb-10"
      >
        <div className="text-6xl mb-4">🧠</div>
        <h1 className="text-4xl font-black text-foreground tracking-tight">
          Napi Kvíz
        </h1>
        <p className="mt-3 text-muted-foreground text-lg font-medium">
          Mennyi mindent tudsz? Válaszd ki a korosztályodat!
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 w-full max-w-sm"
      >
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.id}
            variants={itemVariants}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(opt.id)}
            className={`
              relative overflow-hidden rounded-2xl border-2 ${opt.border}
              bg-white shadow-lg cursor-pointer
              flex items-center gap-5 px-6 py-5 text-left
              transition-shadow hover:shadow-xl
            `}
          >
            <div
              className={`
                w-16 h-16 rounded-xl bg-gradient-to-br ${opt.gradient}
                flex items-center justify-center text-3xl shrink-0
                shadow-md
              `}
            >
              {opt.emoji}
            </div>
            <div className="flex-1">
              <div className="text-xl font-black text-foreground">{opt.label}</div>
              <div className="text-sm text-muted-foreground font-semibold mt-0.5">{opt.sub}</div>
            </div>
            <svg
              className="w-5 h-5 text-muted-foreground shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="mt-3 w-full max-w-sm"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />
          <span className="text-xs font-black text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
            Iskolai feladatok
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-yellow-300 to-transparent" />
        </div>
        <motion.button
          key={MATH_OPTION.id}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(MATH_OPTION.id)}
          className={`
            w-full relative overflow-hidden rounded-2xl border-2 ${MATH_OPTION.border}
            bg-white shadow-lg cursor-pointer
            flex items-center gap-5 px-6 py-5 text-left
            transition-shadow hover:shadow-xl
          `}
        >
          <div
            className={`
              w-16 h-16 rounded-xl bg-gradient-to-br ${MATH_OPTION.gradient}
              flex items-center justify-center text-3xl shrink-0
              shadow-md
            `}
          >
            {MATH_OPTION.emoji}
          </div>
          <div className="flex-1">
            <div className="text-xl font-black text-foreground">{MATH_OPTION.label}</div>
            <div className="text-sm text-muted-foreground font-semibold mt-0.5">{MATH_OPTION.sub}</div>
          </div>
          <svg
            className="w-5 h-5 text-muted-foreground shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </motion.div>

      {onCustomQuiz && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-5 w-full max-w-sm"
        >
          <button
            onClick={onCustomQuiz}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-violet-300 bg-white hover:bg-violet-50 hover:border-violet-400 px-6 py-4 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-2xl shrink-0 shadow-md">
              ✨
            </div>
            <div className="flex-1">
              <div className="text-base font-black text-violet-700">Saját témájú kvíz</div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">
                Írj be témát vagy tölts fel PDF-et / képet
              </div>
            </div>
            <svg className="w-5 h-5 text-violet-400 shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-center max-w-sm"
      >
        <p className="text-xs font-semibold text-muted-foreground mb-3">
          5 küldetés · ~3 perc · azonnali visszajelzés
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Elfelejthetted a tankönyveket – ez nem iskola. Érdekes témák, gyors kihívások, napi adagban. Ha viszont rákapnál a tanulásra, a napi feladatokkal azt is megteheted. 🌍
        </p>
      </motion.div>
    </div>
  );
}
