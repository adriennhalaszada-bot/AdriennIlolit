import { Sparkles, ArrowRight, Brain, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PersonalizedRecommendationProps {
  onStartRecommendedQuiz: (topicId: string) => void;
  recentAccuracyPercent?: number;
}

export function PersonalizedRecommendation({
  onStartRecommendedQuiz,
  recentAccuracyPercent = 75,
}: PersonalizedRecommendationProps) {
  // Intelligent recommendation logic based on past accuracy
  const recommendation =
    recentAccuracyPercent < 60
      ? {
          topicId: "traffic-safety",
          title: "Közlekedésbiztonság & KRESZ Alapok",
          subtitle: "Az utolsó kvízed alapján ezen a területen érdemes felzárkóznod!",
          difficulty: "Alapfok (Felzárkóztatás)",
          emoji: "🚦",
          color: "from-amber-600 to-orange-600",
        }
      : recentAccuracyPercent < 85
      ? {
          topicId: "math-fun",
          title: "Játékos Matematika & Logika",
          subtitle: "Kiváló ütemben haladsz! Ez a modul szilárdítja meg a logikai készségeidet.",
          difficulty: "Középhaladó",
          emoji: "🧮",
          color: "from-emerald-600 to-teal-600",
        }
      : {
          topicId: "science-nature",
          title: "Természettudomány & Felfedezések",
          subtitle: "Profi szinten teljesítesz! Próbáld ki ezt a haladó kihívást!",
          difficulty: "Haladó kihívás",
          emoji: "🔬",
          color: "from-indigo-600 to-purple-600",
        };

  return (
    <div className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
              <Sparkles className="w-3 h-3" /> Személyre Szabott Ajánlás
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Személyes Tanulási Útvonal
            </h3>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-extrabold border-emerald-300 text-emerald-700 dark:text-emerald-400">
          Pontosság: {recentAccuracyPercent}%
        </Badge>
      </div>

      {/* Recommended Task Card */}
      <div className={`p-5 rounded-2xl bg-gradient-to-r ${recommendation.color} text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-emerald-950/20`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{recommendation.emoji}</span>
            <Badge className="bg-white/20 backdrop-blur border border-white/30 text-white font-bold text-[10px]">
              {recommendation.difficulty}
            </Badge>
          </div>
          <h4 className="text-lg font-black text-white leading-tight">
            Következő feladat: {recommendation.title}
          </h4>
          <p className="text-xs text-white/90 font-medium">
            {recommendation.subtitle}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => onStartRecommendedQuiz(recommendation.topicId)}
          className="bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs rounded-xl shadow-md shrink-0 px-5 py-2.5"
        >
          Indítás most <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
