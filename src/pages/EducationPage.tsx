import { Layout } from "@/components/layout/Layout";
import EducationApp from "@/education/App";
import { UnifiedModuleHeader } from "@/components/shared/UnifiedModuleHeader";
import { Trophy, Zap, Flame } from "lucide-react";

export function EducationPage() {
  return (
    <Layout>
      <UnifiedModuleHeader
        title="ILOLIT Oktatás & Kurzusok"
        subtitle="Szakmai képzések, továbbképzések, interaktív tanulómodulok és tudáspróbák egyetlen átlátható felületen."
        moduleKey="education"
        searchPlaceholder="Keresés kurzus vagy témakör alapján (pl. balayage, e-commerce, ingatlan)"
      />

      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16">
        {/* Progress summary bar */}
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>5 Napos Tanulási Széria</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-sm">
                <Zap className="w-4 h-4 text-purple-600" />
                <span>140 Összes Pont</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Jelenlegi szint:</span>
              <span className="px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800">
                Haladó Tanuló (Szint 3)
              </span>
            </div>
          </div>
        </div>

        {/* Embedded Education App Container */}
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden min-h-[600px] p-4 md:p-6">
            <EducationApp />
          </div>
        </div>
      </div>
    </Layout>
  );
}
