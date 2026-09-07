import { useState } from "react";
import { useUserAccountStore, ProviderDetails } from "@/lib/userAccountStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Briefcase, Sparkles, PlusCircle, Check, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProfileSwitcher() {
  const { toast } = useToast();
  const { currentUser, activeProfile, switchActiveProfile, upgradeToProvider } = useUserAccountStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Business profile form
  const [businessName, setBusinessName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState<"beauty" | "education" | "service" | "other">("beauty");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  if (!currentUser) return null;

  const hasBusiness = currentUser.role === "both" || currentUser.role === "provider" || !!currentUser.providerDetails;

  const handleSwitch = (mode: "private" | "business") => {
    if (mode === "business" && !hasBusiness) {
      setCreateModalOpen(true);
      return;
    }
    switchActiveProfile(mode);
    toast({
      title: mode === "private" ? "Váltva: 👤 Magán Profil" : "Váltva: 💼 Vállalkozói Profil",
      description: mode === "private"
        ? `Aktív azonosító: ${currentUser.nickname}`
        : `Aktív azonosító: ${currentUser.providerDetails?.companyName || "Vállalkozói fiók"}`,
    });
  };

  const handleCreateBusiness = () => {
    if (!businessName.trim()) {
      toast({ title: "A vállalkozás / szalon neve kötelező!", variant: "destructive" });
      return;
    }

    const providerDetails: ProviderDetails = {
      companyName: businessName.trim(),
      businessType,
      description: description.trim() || "Professzionális szolgáltatások és ajánlatok.",
      categories: [businessType === "beauty" ? "Szépségápolás" : "Szolgáltatások"],
      phone: phone.trim() || "+36 30 000 0000",
      address: address.trim() || "Magyarország",
      taxNumber: taxNumber.trim() || undefined,
    };

    const res = upgradeToProvider(providerDetails);
    if (res.success) {
      switchActiveProfile("business");
      setCreateModalOpen(false);
      toast({
        title: "Vállalkozói profil sikeresen létrehozva! 🎉",
        description: "Mostantól egyetlen kattintással válthatsz a Magán és Vállalkozói profilod között.",
      });
    }
  };

  return (
    <>
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
        {/* Private Profile Button */}
        <button
          type="button"
          onClick={() => handleSwitch("private")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
            activeProfile === "private"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md scale-105"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <User className="w-3.5 h-3.5 text-emerald-600" />
          <span>Magán ({currentUser.nickname})</span>
        </button>

        {/* Switch Icon */}
        <div className="px-1 text-slate-400">
          <ArrowRightLeft className="w-3 h-3" />
        </div>

        {/* Business Profile Button */}
        <button
          type="button"
          onClick={() => handleSwitch("business")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
            activeProfile === "business"
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-rose-300" />
          <span>
            {hasBusiness
              ? `Vállalkozói (${currentUser.providerDetails?.companyName?.slice(0, 14) || "Üzleti"})`
              : "+ Vállalkozói Fiók"}
          </span>
        </button>
      </div>

      {/* Create Business Profile Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-rose-500" /> Vállalkozói Profil Létrehozása
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Hozz létre egy vállalkozói profilt a jelenlegi fiókodon belül! A magán beceneved és adataid teljesen elkülönülnek a vállalkozói neveidtől.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Vállalkozói / Szalon Neve *</label>
              <Input
                placeholder="pl. Kata Balayage Hajstúdió"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hivatalos Cégnév</label>
                <Input
                  placeholder="pl. Balayage Kft."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Vállalkozás Típusa</label>
                <Select value={businessType} onValueChange={(v: any) => setBusinessType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beauty">🌸 Szépségápolás (Beauty)</SelectItem>
                    <SelectItem value="education">🎓 Oktatás (Education)</SelectItem>
                    <SelectItem value="service">🛠️ Szolgáltatás (Service)</SelectItem>
                    <SelectItem value="other">💼 Egyéb Vállalkozás</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Bemutatkozás & Leírás</label>
              <Textarea
                placeholder="Írd le röviden a szolgáltatásaidat..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Telefonszám</label>
                <Input
                  placeholder="+36 30 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Adószám (opcionális)</label>
                <Input
                  placeholder="12345678-1-42"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Mégse</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={handleCreateBusiness}
            >
              Vállalkozói Profil Aktiválása
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
