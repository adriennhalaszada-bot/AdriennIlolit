import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileQuestion, Plus, Trash2, CheckSquare, AlignLeft, HelpCircle } from "lucide-react";
import type { BeautyServiceOffering } from "@workspace/api-client-react";

export interface IntakeQuestion {
  id: string;
  questionText: string;
  type: "text" | "checkbox" | "select";
  options?: string[];
  isRequired: boolean;
  assignedServiceName: string;
}

const mockQuestions: IntakeQuestion[] = [
  {
    id: "q-1",
    questionText: "Van-e ismert allergiája hajfestékre vagy vegyi anyagokra?",
    type: "select",
    options: ["Nincs allergia", "Igen, enyhe érzékenység", "Igen, súlyos allergia"],
    isRequired: true,
    assignedServiceName: "Balayage Festés & Ápolás",
  },
  {
    id: "q-2",
    questionText: "Mikor volt utoljára professzionális hajápolási kezelése?",
    type: "text",
    isRequired: false,
    assignedServiceName: "Összes szolgáltatás",
  },
];

interface IntakeFormsTabProps {
  services: BeautyServiceOffering[];
}

export function IntakeFormsTab({ services }: IntakeFormsTabProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<IntakeQuestion[]>(mockQuestions);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formText, setFormText] = useState("");
  const [formType, setFormType] = useState<"text" | "checkbox" | "select">("text");
  const [formRequired, setFormRequired] = useState(true);
  const [formService, setFormService] = useState("Összes szolgáltatás");
  const [formOptions, setFormOptions] = useState("Opció 1, Opció 2, Opció 3");

  const handleOpenAdd = () => {
    setFormText("");
    setFormType("text");
    setFormRequired(true);
    setFormService(services[0]?.name || "Összes szolgáltatás");
    setFormOptions("Opció 1, Opció 2, Opció 3");
    setIsModalOpen(true);
  };

  const handleSaveQuestion = () => {
    if (!formText.trim()) {
      toast({ title: "Kérjük adja meg a kérdés szövegét!", variant: "destructive" });
      return;
    }

    const newQ: IntakeQuestion = {
      id: `q-${Date.now()}`,
      questionText: formText,
      type: formType,
      isRequired: formRequired,
      assignedServiceName: formService,
      options: formType === "select" ? formOptions.split(",").map((s) => s.trim()) : undefined,
    };

    setQuestions((prev) => [...prev, newQ]);
    toast({ title: "Új előzetes kérdés elmentve!" });
    setIsModalOpen(false);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    toast({ title: "Kérdés törölve." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileQuestion className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-slate-900">11. Foglalási Kérdőívek (Intake Forms)</h2>
          </div>
          <p className="text-sm text-slate-500">
            Gyűjtsön fontos információkat (pl. allergiák, preferenciák, korábbi kezelések) a vendégektől a foglalás véglegesítése előtt.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md">
          <Plus className="w-4 h-4" /> Új kérdés hozzáadása
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {questions.map((q) => (
          <Card key={q.id} className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-bold text-slate-700 bg-slate-50">
                  {q.type === "text" && "📝 Szöveges válasz"}
                  {q.type === "select" && "📋 Választási lehetőség"}
                  {q.type === "checkbox" && "☑️ Checkbox elfogadás"}
                </Badge>
                {q.isRequired ? (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold">Kötelező</Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 font-bold">Opcionális</Badge>
                )}
                <span className="text-xs text-emerald-700 font-bold">Szolgáltatás: {q.assignedServiceName}</span>
              </div>

              <h3 className="font-extrabold text-base text-slate-900">{q.questionText}</h3>

              {q.options && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {q.options.map((opt, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
                      • {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50 self-end sm:self-center" onClick={() => handleDeleteQuestion(q.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-xl text-slate-900">
              Új előzetes kérdés hozzáadása
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kérdés szövege *</label>
              <Input
                placeholder="Pl. Van-e érzékenysége kifejezetten illatanyagokra?"
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Válasz típusa</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="text">Szabad szöveges válasz</option>
                <option value="select">Legördülő opciók (Több lehetőségből egy)</option>
                <option value="checkbox">Egyedi nyilatkozat / Checkbox</option>
              </select>
            </div>

            {formType === "select" && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Válaszlehetőségek (vesszővel elválasztva)</label>
                <Input
                  placeholder="Nem, Enyhe, Súlyos"
                  value={formOptions}
                  onChange={(e) => setFormOptions(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Érintett szolgáltatás</label>
              <select
                value={formService}
                onChange={(e) => setFormService(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Összes szolgáltatás">Minden szolgáltatásra érvényes</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label htmlFor="req-q" className="text-xs font-bold text-slate-700 cursor-pointer">
                Kötelező kitölteni a foglaláshoz?
              </label>
              <Switch id="req-q" checked={formRequired} onCheckedChange={setFormRequired} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
              Mégse
            </Button>
            <Button onClick={handleSaveQuestion} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
