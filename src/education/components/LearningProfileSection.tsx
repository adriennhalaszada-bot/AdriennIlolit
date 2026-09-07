import { Flame, Zap, Trophy, Award, CheckCircle2, Star, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface LearningProfileSectionProps {
  xp: number;
  streak: number;
  completedCount: number;
  totalTasksCount?: number;
}

export function LearningProfileSection({
  xp,
  streak,
  completedCount,
  totalTasksCount = 24,
}: LearningProfileSectionProps) {
  const currentLevel = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const overallProgressPercent = Math.min(100, Math.round((completedCount / totalTasksCount) * 100));

  const badges = [
    { id: "b1", title: "🏆 Kvíz Mester", desc: "10 hibátlan teszt", unlocked: completedCount >= 2 },
    { id: "b2", title: "🔥 Széria Bajnok", desc: "5 napos folyamatos tanulás", unlocked: streak >= 5 },
    { id: "b3", title: "💡 Tudás Úttörő", desc: "Első sikeres kurzus", unlocked: completedCount >= 1 },
    { id: "b4", title: "⚡ 500+ XP Klub", desc: "500 XP elérése", unlocked: xp >= 500 },
  ];

  return (
    <div className="bg-gradient-to-br from-emerald-900/10 via-teal-900/10 to-slate-900/10 border border-emerald-500/20 rounded-3xl p-6 space-y-6">
      {/* Header Profile Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-emerald-500/20 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
            Lvl {currentLevel}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Haladó Tanonc Profil
              </h3>
              <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">
                Level {currentLevel}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Duolingo-szerű játékos tanulási statisztika
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 font-black text-xs">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-500 animate-pulse" />
            <span>{streak} Napos Széria!</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-600 dark:text-yellow-400 font-black text-xs">
            <Zap className="w-4 h-4 fill-yellow-400 text-yellow-500" />
            <span>{xp} XP</span>
          </div>
        </div>
      </div>

      {/* Progress Bars Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Level XP Progress */}
        <div className="space-y-2 bg-white dark:bg-slate-950 p-4 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4 text-emerald-600" /> Szint haladás (Level {currentLevel})
            </span>
            <span className="text-emerald-600 font-extrabold">{levelProgress} / 100 XP</span>
          </div>
          <Progress value={levelProgress} className="h-3 bg-slate-100 dark:bg-slate-800" />
          <p className="text-[10px] text-slate-400 font-medium">Még {100 - levelProgress} XP a következő szintig!</p>
        </div>

        {/* Completed Tasks Progress */}
        <div className="space-y-2 bg-white dark:bg-slate-950 p-4 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Teljesített Feladatok
            </span>
            <span className="text-emerald-600 font-extrabold">{completedCount} / {totalTasksCount} kész ({overallProgressPercent}%)</span>
          </div>
          <Progress value={overallProgressPercent} className="h-3 bg-slate-100 dark:bg-slate-800" />
          <p className="text-[10px] text-slate-400 font-medium">Folytasd a napi szériát a gyorsabb előrelépésért!</p>
        </div>
      </div>

      {/* Earned Badges Row */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
          <Award className="w-4 h-4 text-emerald-600" /> Megszerzett Jelvények (Badge-ek)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-3 rounded-2xl border text-center space-y-1 transition ${
                badge.unlocked
                  ? "bg-white dark:bg-slate-950 border-emerald-500/40 shadow-sm"
                  : "bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60 grayscale"
              }`}
            >
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {badge.title}
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                {badge.desc}
              </p>
              {badge.unlocked ? (
                <span className="inline-block text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300/40 mt-1">
                  ✓ Megszerezve
                </span>
              ) : (
                <span className="inline-block text-[9px] font-bold text-slate-400 mt-1">
                  🔒 Zárolva
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
