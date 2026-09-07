import { useState } from "react";
import { useUserAccountStore, type ProviderDetails } from "@/lib/userAccountStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, ShieldCheck, CheckCircle2, Sparkles, Building2, Phone, MapPin, FileText } from "lucide-react";

interface ProviderUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProviderUpgradeModal({ isOpen, onClose }: ProviderUpgradeModalProps) {
  const { toast } = useToast();
  const { currentUser, upgradeToProvider, categories: storeCategories, addCustomCategory } = useUserAccountStore();

  const [companyName, setCompanyName] = useState(currentUser?.providerDetails?.companyName || "");
  const [businessType, setBusinessType] = useState<"beauty" | "education" | "service" | "other">(
    currentUser?.providerDetails?.businessType || "beauty"
  );
  const [description, setDescription] = useState(currentUser?.providerDetails?.description || "");
  const [phone, setPhone] = useState(currentUser?.providerDetails?.phone || "");
  const [address, setAddress] = useState(currentUser?.providerDetails?.address || "");
  const [taxNumber, setTaxNumber] = useState(currentUser?.providerDetails?.taxNumber || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentUser?.providerDetails?.categories || ["Fodrászat & Hajápolás"]
  );

  const [dropdownSelect, setDropdownSelect] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const handleDropdownChange = (val: string) => {
    if (val === "CREATE_NEW") {
      setShowCustomInput(true);
      setDropdownSelect("");
    } else if (val) {
      if (!selectedCategories.includes(val)) {
        setSelectedCategories([...selectedCategories, val]);
      }
      setDropdownSelect("");
    }
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) {
      toast({ title: "Hiányzó név", description: "Kérjük add meg az új szolgáltatás nevét!", variant: "destructive" });
      return;
    }

    const created = addCustomCategory(trimmed);
    if (!selectedCategories.includes(created)) {
      setSelectedCategories([...selectedCategories, created]);
    }
    setCustomCategoryInput("");
    setShowCustomInput(false);
    toast({ title: "✓ Új szolgáltatás létrehozva!", description: `'${created}' bekerült a szolgáltatások listájába!` });
  };

  const removeCategory = (cat: string) => {
    setSelectedCategories(selectedCategories.filter((c: string) => c !== cat));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast({ title: "Hiányzó adatok", description: "Kérjük add meg a cégnevedet / vállalkozásod nevét!", variant: "destructive" });
      return;
    }

    if (!description.trim()) {
      toast({ title: "Hiányzó adatok", description: "Kérjük írj egy rövid leírást a vállalkozásodról!", variant: "destructive" });
      return;
    }

    if (!phone.trim() || !address.trim()) {
      toast({ title: "Hiányzó adatok", description: "Kérjük add meg a cég telefonszámát és pontos címét!", variant: "destructive" });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({ title: "Hiányzó szolgáltatás", description: "Kérjük válassz vagy hozz létre legalább egy szolgáltatást!", variant: "destructive" });
      return;
    }

    const payload: ProviderDetails = {
      companyName: companyName.trim(),
      businessType,
      description: description.trim(),
      categories: selectedCategories,
      phone: phone.trim(),
      address: address.trim(),
      taxNumber: taxNumber.trim() || undefined
    };

    const res = upgradeToProvider(payload);

    if (!res.success) {
      toast({ title: "Hiba", description: res.error, variant: "destructive" });
      return;
    }

    toast({
      title: "🎉 Gratulálunk! Vállalkozói Fiók Aktiválva!",
      description: `A fiókod szerepköre 'both' státuszra váltott, és a kiválasztott szolgáltatásokhoz lett besorolva.`
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-2">
            <Briefcase className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-xl font-black">💼 Vállalkozássá Válás</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Alakítsd át a meglévő fiókodat szolgáltatói profilra egyetlen kattintással! (Szerepkör váltás: Magánszemély + Vállalkozó)
          </DialogDescription>
        </DialogHeader>

        {/* Executive Privacy Banner */}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <div>
            <strong>🔒 100% Személyes Adatvédelem Garantálva:</strong>
            <span className="block text-[11px] opacity-90">
              A nyilvános felületen a Beceneved (@{currentUser?.nickname || "nickname"}) és a Cégnév jelenhet meg. Az ügyvezető valódi neve és személyes emailje <strong>SOHASEM</strong> látható a látogatók számára!
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Company Name */}
          <div>
            <label className="text-xs font-bold mb-1 block flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-600" /> Cégnév / Vállalkozás Neve (Publikus) *
            </label>
            <Input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="pl. Kata Balayage Hajstúdió Kft."
              className="text-xs font-semibold"
              required
            />
          </div>

          {/* Business Type */}
          <div>
            <label className="text-xs font-bold mb-1 block">Vállalkozás Típusa / Fő Területe *</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border bg-background text-xs font-bold"
            >
              <option value="beauty">🌸 Szépségipar (Fodrász, Körmös, Kozmetikus, Sminkes)</option>
              <option value="education">🎓 Oktatás & Tanítás (ILOLIT Kvízek, Magánórák)</option>
              <option value="service">🛠️ Szolgáltatások & Szakemberek (Szerelők, Fuvarozás, Takarítás)</option>
              <option value="other">📦 Egyéb Kereskedelmi Vállalkozás</option>
            </select>
          </div>

          {/* Service Categories Selection Dropdown & Custom Creation */}
          <div className="space-y-2">
            <label className="text-xs font-bold block flex items-center justify-between">
              <span>Nyújtott Szolgáltatások (Legördülő Menü) *</span>
              <span className="text-[10px] text-amber-600 font-extrabold">
                {selectedCategories.length} kiválasztva
              </span>
            </label>

            {/* Dropdown Select */}
            <select
              value={dropdownSelect}
              onChange={(e) => handleDropdownChange(e.target.value)}
              className="w-full p-2.5 rounded-xl border bg-muted/30 text-xs font-semibold"
            >
              <option value="">-- Válassz a létező szolgáltatások közül --</option>
              {storeCategories.map((cat: string) => (
                <option key={cat} value={cat} disabled={selectedCategories.includes(cat)}>
                  {selectedCategories.includes(cat) ? `✓ ${cat} (Már kiválasztva)` : cat}
                </option>
              ))}
              <option value="CREATE_NEW" className="font-extrabold text-amber-600">
                ✨ Új szolgáltatás létrehozása (Ha nincs a listában)...
              </option>
            </select>

            {/* Custom Category Creation Form */}
            {(showCustomInput || dropdownSelect === "CREATE_NEW") && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs">
                <label className="font-extrabold text-amber-900 dark:text-amber-300 block">
                  ✨ Új Szolgáltatás Hozzáadása a Rendszerhez:
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="pl. Krio-terápia, Kutya-kozmetika..."
                    className="text-xs bg-background"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex-shrink-0"
                  >
                    + Hozzáadás
                  </Button>
                </div>
              </div>
            )}

            {/* Selected Category Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedCategories.map((cat: string) => (
                <Badge
                  key={cat}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs"
                >
                  ✓ {cat}
                  <button
                    type="button"
                    onClick={() => removeCategory(cat)}
                    className="ml-1 text-white/80 hover:text-white font-black"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold mb-1 block flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-600" /> Vállalkozás Leírása / Bemutatkozás (Publikus) *
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rövid bemutatkozás a leendő vendégek és vásárlók számára..."
              rows={3}
              className="text-xs"
              required
            />
          </div>

          {/* Phone & Address (Private System/Contact) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-amber-600" /> Cég Telefonszáma *
              </label>
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+36 30 111 2233"
                className="text-xs"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" /> Vállalkozás Címe *
              </label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="2600 Vác, Széchenyi utca 12."
                className="text-xs"
                required
              />
            </div>
          </div>

          {/* Optional Tax Number */}
          <div>
            <label className="text-xs font-bold mb-1 block">Adószám (Opcionális)</label>
            <Input
              type="text"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="12345678-1-42"
              className="text-xs font-mono"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md cursor-pointer mt-2"
          >
            💼 Vállalkozási Profil Aktiválása (Szerepkör Váltása: Both) →
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
