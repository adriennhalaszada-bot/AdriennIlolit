import { useState } from "react";
import { Users, GraduationCap, Award, BookOpen, CheckCircle2, TrendingUp, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface StudentProgress {
  id: string;
  name: string;
  role: "Gyermek" | "Diák";
  grade: string;
  progressPercent: number;
  completedTopicsCount: number;
  lastQuizScore: string;
  streakDays: number;
  recentActivity: string;
}

export function ParentTeacherDashboard() {
  const [activeRole, setActiveRole] = useState<"parent" | "teacher">("parent");

  const childrenData: StudentProgress[] = [
    {
      id: "c1",
      name: "Kovács Bence",
      role: "Gyermek",
      grade: "4. osztály",
      progressPercent: 82,
      completedTopicsCount: 14,
      lastQuizScore: "9/10 (90%)",
      streakDays: 5,
      recentActivity: "Közlekedésbiztonsági kvíz lezárva (Ma 14:20)",
    },
    {
      id: "c2",
      name: "Kovács Lili",
      role: "Gyermek",
      grade: "2. osztály",
      progressPercent: 65,
      completedTopicsCount: 9,
      lastQuizScore: "8/10 (80%)",
      streakDays: 3,
      recentActivity: "Matematika játékos kvíz lezárva (Tegnap 16:45)",
    },
  ];

  const classData: StudentProgress[] = [
    {
      id: "s1",
      name: "Nagy Máté",
      role: "Diák",
      grade: "5.A osztály",
      progressPercent: 90,
      completedTopicsCount: 18,
      lastQuizScore: "10/10 (100%)",
      streakDays: 7,
      recentActivity: "Természettudományi feladat lezárva",
    },
    {
      id: "s2",
      name: "Tóth Zsófia",
      role: "Diák",
      grade: "5.A osztály",
      progressPercent: 74,
      completedTopicsCount: 12,
      lastQuizScore: "7/10 (70%)",
      streakDays: 4,
      recentActivity: "Nyelvtani feladatsor folyamatban",
    },
    {
      id: "s3",
      name: "Varga Dániel",
      role: "Diák",
      grade: "5.A osztály",
      progressPercent: 58,
      completedTopicsCount: 8,
      lastQuizScore: "6/10 (60%)",
      streakDays: 2,
      recentActivity: "KRESZ Alapok teszt lezárva",
    },
  ];

  const activeData = activeRole === "parent" ? childrenData : classData;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6">
      {/* Header View Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Szülői & Pedagógus Irányítópult
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Kövesd nyomon a gyermekek vagy diákjaid felkészültségét és tanulási haladását!
            </p>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex items-center bg-white dark:bg-slate-950 p-1.5 rounded-2xl border shadow-sm">
          <button
            type="button"
            onClick={() => setActiveRole("parent")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeRole === "parent"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            👨‍👩‍👧 Szülői Fiók
          </button>
          <button
            type="button"
            onClick={() => setActiveRole("teacher")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeRole === "teacher"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            🎓 Pedagógus Fiók
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400">Regisztrált {activeRole === "parent" ? "Gyermekek" : "Diákok"}</span>
            <div className="text-xl font-black text-slate-900 dark:text-white">{activeData.length} fő</div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400">Átlagos Teljesítmény</span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400">
              {Math.round(activeData.reduce((acc, s) => acc + s.progressPercent, 0) / activeData.length)}%
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400">Napi Széria Aktivitás</span>
            <div className="text-xl font-black text-amber-500">100% Aktív</div>
          </div>
        </div>
      </div>

      {/* Student Progress Cards */}
      <div className="space-y-4">
        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
          {activeRole === "parent" ? "Gyermekek Részletes Előmenetele" : "Osztálynévsor & Eredmények (5.A)"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeData.map((student) => (
            <div
              key={student.id}
              className="p-5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:border-emerald-500/50 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {student.name}
                  </h5>
                  <span className="text-xs text-slate-400 font-bold">
                    {student.grade} • 🔥 {student.streakDays} napos széria
                  </span>
                </div>
                <Badge className="bg-emerald-600 text-white font-extrabold text-xs">
                  {student.progressPercent}% Kész
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-extrabold text-slate-500">
                  <span>Modul előrehaladás</span>
                  <span>{student.completedTopicsCount} témakör teljesítve</span>
                </div>
                <Progress value={student.progressPercent} className="h-2.5 bg-slate-100 dark:bg-slate-800" />
              </div>

              {/* Last quiz & activity */}
              <div className="pt-2 border-t text-xs space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                <div>Utolsó kvíz eredmény: <strong className="text-emerald-600 font-black">{student.lastQuizScore}</strong></div>
                <div className="text-[11px] text-slate-400 italic">Legutóbbi aktivitás: {student.recentActivity}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
