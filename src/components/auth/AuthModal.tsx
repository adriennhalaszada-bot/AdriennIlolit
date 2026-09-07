import { useState, useEffect } from "react";
import { useUserAccountStore, generateRandomNicknames, validateCustomNickname } from "@/lib/userAccountStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Lock, Mail, Sparkles, RefreshCw, Check, ShieldCheck, 
  AlertCircle, KeyRound, ArrowRight, CheckCircle2 
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register" | "forgot";
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const { toast } = useToast();
  const { users, register, login, requestPasswordReset, resetPasswordWithToken, verifyEmailWithToken } = useUserAccountStore();

  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset_token" | "verify_email">(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [realName, setRealName] = useState("");

  // Email activation pending states
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [activationEmail, setActivationEmail] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Nickname generation & selection
  const [generatedNicknames, setGeneratedNicknames] = useState<string[]>([]);
  const [selectedNickname, setSelectedNickname] = useState<string>("");
  const [customNickname, setCustomNickname] = useState<string>("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // Checkboxes
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Forgot / Reset password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmittedMsg, setForgotSubmittedMsg] = useState<string | null>(null);
  const [demoResetToken, setDemoResetToken] = useState<string | null>(null);
  const [resetTokenInput, setResetTokenInput] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Generate 3 random nicknames whenever registration tab is shown or refreshed
  useEffect(() => {
    if (mode === "register") {
      refreshNicknames();
    }
  }, [mode]);

  const refreshNicknames = () => {
    const existing = users.map((u: any) => u.nickname);
    const nicks = generateRandomNicknames(realName, email, existing);
    setGeneratedNicknames(nicks);
    setSelectedNickname(nicks[0] || "");
    setCustomNickname("");
    setNicknameError(null);
  };

  // Validate custom nickname live
  useEffect(() => {
    if (mode === "register" && customNickname.trim()) {
      const existing = users.map((u: any) => u.nickname);
      const res = validateCustomNickname(customNickname, realName, email, existing);
      if (!res.valid) {
        setNicknameError(res.error || "Érvénytelen becenév");
      } else {
        setNicknameError(null);
      }
    } else {
      setNicknameError(null);
    }
  }, [customNickname, realName, email, users, mode]);

  const activeNickname = customNickname.trim() ? customNickname.trim() : selectedNickname;

  // Password requirements check: min 6 chars
  const isPasswordValid = password.length >= 6;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !email.includes("@")) {
      toast({
        title: "Érvénytelen E-mail",
        description: "Kérjük adj meg egy érvényes e-mail címet (pl. nev@domain.hu)!",
        variant: "destructive"
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: "Rövid jelszó",
        description: "A jelszónak legalább 6 karakterből kell állnia!",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Jelszó eltérés", description: "A megadott két jelszó nem egyezik meg!", variant: "destructive" });
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setAcceptedTerms(true);
      setAcceptedPrivacy(true);
    }

    const finalNick = activeNickname || `Felhasznalo_${Math.floor(1000 + Math.random() * 9000)}`;

    const res = register({
      email,
      password,
      nickname: finalNick,
      realName: realName.trim() || undefined,
      termsAccepted: true
    });

    if (!res.success) {
      toast({ title: "Regisztrációs hiba", description: res.error, variant: "destructive" });
      return;
    }

    setActivationEmail(email);
    setActivationToken(res.activationToken || null);
    setMode("verify_email");

    toast({
      title: "📩 Megerősítő E-mail Elküldve!",
      description: `Az aktiváló hivatkozást elküldtük a(z) ${email} címre. Kattints az Aktiválás gombra a belépéshez!`
    });
  };

  const handleVerifyEmail = (tokenToVerify?: string) => {
    const targetToken = tokenToVerify || activationToken;
    if (!targetToken) {
      toast({ title: "Aktiválási Hiba", description: "Érvénytelen aktiváló kód!", variant: "destructive" });
      return;
    }

    const res = verifyEmailWithToken(targetToken);
    if (!res.success) {
      toast({ title: "Aktiválási Hiba", description: res.error, variant: "destructive" });
      return;
    }

    toast({
      title: "🎉 Sikeres E-mail Aktiválás!",
      description: `Üdvözlünk a rendszerben @${res.user?.nickname}! A fiókod sikeresen aktiválva.`
    });
    setMode("login");
    onClose();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);
    const res = login(email, password);

    if (!res.success) {
      if (res.requiresVerification) {
        setVerificationError(res.error || null);
        setActivationEmail(res.email || email);
        setActivationToken(res.token || null);
      } else {
        toast({ title: "Bejelentkezési hiba", description: res.error, variant: "destructive" });
      }
      return;
    }

    toast({
      title: "👋 Üdvözlünk újra!",
      description: `Sikeresen bejelentkeztél mint @${res.user?.nickname}`
    });
    onClose();
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = requestPasswordReset(forgotEmail);
    setForgotSubmittedMsg(res.message);
    if (res.tokenForDemo) {
      setDemoResetToken(res.tokenForDemo);
    }
  };

  const handleResetTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = resetPasswordWithToken(resetTokenInput, newPassword);

    if (!res.success) {
      toast({ title: "Hiba", description: res.error, variant: "destructive" });
      return;
    }

    toast({
      title: "✓ Jelszó sikeresen megváltoztatva!",
      description: "Kérjük jelentkezz be az új jelszavaddal."
    });
    setMode("login");
    setForgotSubmittedMsg(null);
    setDemoResetToken(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-600/10 dark:bg-violet-400/10 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <DialogTitle className="text-xl font-black">
            {mode === "login" && "Bejelentkezés"}
            {mode === "register" && "Fiók Regisztráció"}
            {mode === "forgot" && "Jelszó Visszaállítása"}
            {mode === "reset_token" && "Új Jelszó Megadása"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {mode === "login" && "Lépj be a fiókodba a piactér és a szépségipari funkciók használatához!"}
            {mode === "register" && "Hozz létre ingyenes fiókot generált becenévvel és adatvédelemmel!"}
            {mode === "forgot" && "Add meg a regisztrált email címedet a biztonsági visszaállító linkért!"}
            {mode === "reset_token" && "Írd be a visszaállító tokent és az új jelszavadat!"}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Navigation Tabs */}
        {(mode === "login" || mode === "register") && (
          <div className="flex border-b mb-4">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${mode === "login" ? "border-violet-600 text-violet-600" : "border-transparent text-muted-foreground"}`}
            >
              🔑 Bejelentkezés
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition ${mode === "register" ? "border-violet-600 text-violet-600" : "border-transparent text-muted-foreground"}`}
            >
              ✨ Új Regisztráció
            </button>
          </div>
        )}

        {/* ── MODE 1: LOGIN FORM ── */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            {verificationError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-300">{verificationError}</p>
                </div>
                <Button
                  type="button"
                  onClick={() => handleVerifyEmail(activationToken || undefined)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-xl"
                >
                  ✉️ E-mail Cím Aktiválása Most (1-Kattintás)
                </Button>
              </div>
            )}

            <div>
              <label className="text-xs font-bold mb-1 block">E-mail cím vagy @becenév</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelda@email.hu vagy @Becenév..."
                  className="pl-9 text-xs font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold">Jelszó</label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-[11px] font-bold text-violet-600 hover:underline"
                >
                  Elfelejtettem a jelszavam
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 text-xs font-medium"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-sm cursor-pointer">
              Bejelentkezés →
            </Button>

            {/* Quick Demo Login Presets */}
            <div className="pt-3 border-t space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground block text-center">
                ⚡ Gyors Demo Bejelentkezés 1-Kattintással:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("kata.szalon@example.hu");
                    setPassword("Kata1234");
                    const res = login("kata.szalon@example.hu", "Kata1234");
                    if (res.success) {
                      toast({ title: "💼 Bejelentkezve mint Kata!", description: "Balayage Szalon Tulajdonos fiók." });
                      onClose();
                    }
                  }}
                  className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>💼 Kata (Fodrász)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("vevo@example.hu");
                    setPassword("Vevo1234");
                    const res = login("vevo@example.hu", "Vevo1234");
                    if (res.success) {
                      toast({ title: "🛍️ Bejelentkezve mint Péter!", description: "Vásárlói / Vevői fiók." });
                      onClose();
                    }
                  }}
                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>🛒 Péter (Vásárló)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@lolit.hu");
                    setPassword("Admin1234");
                    const res = login("admin@lolit.hu", "Admin1234");
                    if (res.success) {
                      toast({ title: "🛡️ Bejelentkezve mint Admin!", description: "Rendszer Adminisztrátor fiók." });
                      onClose();
                    }
                  }}
                  className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>🛡️ Admin</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── MODE 2: REGISTER FORM ── */}
        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold mb-1 block">E-mail cím *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="valodi.email@domain.hu"
                className="text-xs"
                required
              />
              <span className="text-[10px] text-muted-foreground">Az email címedet SOHA nem mutatjuk meg más felhasználóknak.</span>
            </div>

            {/* Optional Real Name (Private) */}
            <div>
              <label className="text-xs font-bold mb-1 block">Valódi Név (Opcionális / Nem Publikus)</label>
              <Input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="pl. Kovács Katalin"
                className="text-xs"
              />
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 text-emerald-600 font-semibold">
                <ShieldCheck className="w-3 h-3" /> Csak számlázáshoz és ügyfélszolgálathoz. Senki más nem látja!
              </span>
            </div>

            {/* NICKNAME GENERATION SECTION */}
            <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-600" /> Generált Nyilvános Becenév (Nickname) *
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={refreshNicknames}
                  className="h-7 text-[10px] font-bold text-violet-600 hover:bg-violet-200/50"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Újakat kérek 🔄
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Válassz a rendszer által ajánlott becenevekből, vagy adj meg egy saját egyedi becenevet!
              </p>

              {/* 3 Random Generated Nickname Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {generatedNicknames.map((nick) => {
                  const isSel = selectedNickname === nick && !customNickname.trim();
                  return (
                    <button
                      key={nick}
                      type="button"
                      onClick={() => {
                        setSelectedNickname(nick);
                        setCustomNickname("");
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-black text-center transition cursor-pointer flex items-center justify-between ${
                        isSel
                          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                          : "bg-background text-foreground hover:border-violet-400"
                      }`}
                    >
                      <span className="truncate">@{nick}</span>
                      {isSel && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Nickname Input */}
              <div className="pt-1">
                <label className="text-[11px] font-bold block mb-1">VAGY saját becenév megadása:</label>
                <Input
                  type="text"
                  value={customNickname}
                  onChange={(e) => setCustomNickname(e.target.value)}
                  placeholder="pl. Roka_Vandor_99 (min. 3, max. 20 kar.)"
                  className="text-xs bg-background"
                />
                {nicknameError ? (
                  <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" /> {nicknameError}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Engedélyezett: betűk, számok, _ és -. Nem tartalmazhatja a valódi neved vagy az email címed.
                  </span>
                )}
              </div>

              <div className="p-2 bg-background rounded-xl border text-[11px] font-bold text-violet-700 dark:text-violet-300 flex items-center gap-2">
                <span>Nyilvános Azonosítód:</span>
                <Badge className="bg-violet-600 text-white font-extrabold text-xs">
                  @{activeNickname}
                </Badge>
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold mb-1 block">Jelszó *</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">Jelszó megerősítése *</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="text-xs"
                  required
                />
              </div>
            </div>

            {/* Password Validation Hints */}
            <div className="p-3 bg-muted/60 rounded-xl text-[11px] space-y-1 font-semibold border border-slate-200">
              <div className={password.length >= 8 ? "text-emerald-600 font-bold" : "text-slate-500"}>
                {password.length >= 8 ? "✓" : "○"} Legalább 8 karakter hosszúság
              </div>
              <div className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? "text-emerald-600 font-bold" : "text-slate-500"}>
                {/[A-Z]/.test(password) && /[a-z]/.test(password) ? "✓" : "○"} Legalább egy nagybetű (A-Z) és kisbetű (a-z)
              </div>
              <div className={/[0-9]/.test(password) ? "text-emerald-600 font-bold" : "text-slate-500"}>
                {/[0-9]/.test(password) ? "✓" : "○"} Legalább egy szám (0-9)
              </div>
              <div className={password && password === confirmPassword ? "text-emerald-600 font-bold" : "text-slate-500"}>
                {password && password === confirmPassword ? "✓" : "○"} Jelszó megerősítése egyezik
              </div>
            </div>

            {/* REQUIRED CHECKBOXES */}
            <div className="space-y-2 pt-2 border-t">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-xs text-foreground font-semibold">
                  Elfogadom az <a href="/gyik" target="_blank" className="text-violet-600 underline font-extrabold">Általános Szerződési Feltételeket (ÁSZF)</a> *
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-xs text-foreground font-semibold">
                  Elfogadom az <a href="/gyik" target="_blank" className="text-violet-600 underline font-extrabold">Adatvédelmi Tájékoztatót</a> *
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs py-3.5 rounded-xl shadow-md cursor-pointer"
            >
              Fiók Regisztrálása Megerősítéssel →
            </Button>

            {/* 1-Click Quick Register Test Preset */}
            <div className="pt-2 border-t text-center">
              <button
                type="button"
                onClick={() => {
                  const testNum = Math.floor(1000 + Math.random() * 9000);
                  const testEmail = `teszt_${testNum}@example.hu`;
                  const testPassword = "Jelszo123";
                  const testNick = `TesztFelhasznalo_${testNum}`;

                  setEmail(testEmail);
                  setPassword(testPassword);
                  setConfirmPassword(testPassword);
                  setSelectedNickname(testNick);
                  setAcceptedTerms(true);
                  setAcceptedPrivacy(true);

                  const res = register({
                    email: testEmail,
                    password: testPassword,
                    nickname: testNick,
                    termsAccepted: true
                  });

                  if (res.success) {
                    setActivationEmail(testEmail);
                    setActivationToken(res.activationToken || null);
                    setMode("verify_email");
                    toast({
                      title: "🎉 Minta Regisztráció Létrehozva!",
                      description: `Fiók: ${testEmail}. Kattints az Aktiválás gombra a belépéshez!`
                    });
                  }
                }}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>⚡ 1-Kattintásos Minta Regisztráció Generator</span>
              </button>
            </div>
          </form>
        )}

        {/* ── MODE 3: FORGOT PASSWORD FORM ── */}
        {mode === "forgot" && (
          <div className="space-y-4">
            {forgotSubmittedMsg ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5" /> Kérelem Feldolgozva!
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {forgotSubmittedMsg}
                </p>

                {demoResetToken && (
                  <div className="p-3 bg-background rounded-xl border space-y-2 mt-2">
                    <div className="text-[11px] font-bold text-violet-600">⚡ Fejlesztői / Teszt Visszaállító Link:</div>
                    <code className="text-[10px] block break-all p-1.5 bg-muted rounded font-mono">
                      https://oldal.hu/uj-jelszo?token={demoResetToken}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setResetTokenInput(demoResetToken);
                        setMode("reset_token");
                      }}
                      className="w-full bg-violet-600 text-white font-extrabold text-xs rounded-lg py-1.5"
                    >
                      Ugrás az Új Jelszó Megadására →
                    </Button>
                  </div>
                )}

                <Button type="button" variant="outline" onClick={() => setMode("login")} className="w-full text-xs font-bold rounded-xl">
                  Vissza a Bejelentkezéshez
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold mb-1 block">Regisztrált e-mail cím</label>
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="pelda@email.hu"
                    className="text-xs"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-sm">
                  Visszaállító Link Küldése (30–60 perc érvényesség) →
                </Button>
                <Button type="button" variant="ghost" onClick={() => setMode("login")} className="w-full text-xs font-bold">
                  Mégse, vissza a bejelentkezéshez
                </Button>
              </form>
            )}
          </div>
        )}

        {/* ── MODE 5: EMAIL VERIFICATION VIEW ── */}
        {mode === "verify_email" && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Mail className="w-7 h-7 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-lg text-foreground">✉️ E-mail Megerősítés Szükséges</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                A regisztrációd rögzítésre került. Az aktiváló hivatkozást elküldtük a(z) <span className="font-bold text-foreground">{activationEmail}</span> e-mail címre.
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 text-left">
              <div className="text-xs font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Teszt / Demó E-mail Szimulátor:</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Kattints az alábbi gombra az e-mail megerősítés 1-kattintásos elvégzéséhez és a fiókod azonnali aktiválásához:
              </p>

              <Button
                type="button"
                onClick={() => handleVerifyEmail(activationToken || undefined)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer"
              >
                ✉️ Aktiváló Link Megnyitása & Belépés →
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("login")}
              className="w-full text-xs font-bold rounded-xl"
            >
              Vissza a Bejelentkezéshez
            </Button>
          </div>
        )}

        {/* ── MODE 4: RESET TOKEN PASSWORD FORM ── */}
        {mode === "reset_token" && (
          <form onSubmit={handleResetTokenSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold mb-1 block">Visszaállító Token</label>
              <Input
                type="text"
                value={resetTokenInput}
                onChange={(e) => setResetTokenInput(e.target.value)}
                placeholder="reset_..."
                className="text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Új Jelszó (Min. 8 kar, nagybetű+kisbetű+szám)</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="text-xs"
                required
              />
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-sm">
              Új Jelszó Beállítása & Munkamenetek Kijelentkeztetése →
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
