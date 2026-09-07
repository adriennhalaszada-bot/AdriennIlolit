import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserAccountStore, generateRandomNicknames, validateCustomNickname, validatePasswordFormat } from "@/lib/userAccountStore";
import { ShieldCheck, Sparkles, RefreshCw, Check, AlertCircle, ArrowLeft } from "lucide-react";

export function RegisterPage() {
  const [, navigate] = useLocation();
  const { users, register, verifyEmailWithToken } = useUserAccountStore();

  const [email, setEmail] = useState("");
  const [realName, setRealName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [generatedNicknames, setGeneratedNicknames] = useState<string[]>([]);
  const [selectedNickname, setSelectedNickname] = useState("");
  const [customNickname, setCustomNickname] = useState("");
  const [nicknameError, setNicknameError] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activationToken, setActivationToken] = useState("");

  // Refresh random nicknames whenever realName or email changes
  useEffect(() => {
    const existingNicks = users.map((u) => u.nickname);
    const nicks = generateRandomNicknames(realName, email, existingNicks);
    setGeneratedNicknames(nicks);
    if (!selectedNickname || !nicks.includes(selectedNickname)) {
      setSelectedNickname(nicks[0] || "");
    }
  }, [realName, email, users]);

  // Live validate custom nickname
  useEffect(() => {
    if (!customNickname.trim()) {
      setNicknameError("");
      return;
    }
    const existingNicks = users.map((u) => u.nickname);
    const res = validateCustomNickname(customNickname, realName, email, existingNicks);
    setNicknameError(res.valid ? "" : res.error || "");
  }, [customNickname, realName, email, users]);

  const activeNickname = customNickname.trim() ? customNickname.trim() : selectedNickname;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!acceptedTerms || !acceptedPrivacy) {
      setFormError("Az ÁSZF és az Adatvédelmi Nyilatkozat elfogadása kötelező!");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("A megadott jelszavak nem egyeznek meg!");
      return;
    }

    const pwdCheck = validatePasswordFormat(password);
    if (!pwdCheck.valid) {
      setFormError(pwdCheck.error || "Hibás jelszó formátum!");
      return;
    }

    if (customNickname.trim() && nicknameError) {
      setFormError(`Becenév hiba: ${nicknameError}`);
      return;
    }

    const res = register({
      email,
      password,
      nickname: activeNickname,
      realName: realName.trim() || undefined,
      termsAccepted: acceptedTerms && acceptedPrivacy,
    });

    if (!res.success) {
      setFormError(res.error || "Sikertelen regisztráció!");
      return;
    }

    setActivationToken(res.activationToken || "");
    setSuccessMessage("Sikeres regisztráció! Elküldtük az aktiváló e-mailt.");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-6 font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Vissza a Főoldalra
        </Button>

        <Card className="shadow-2xl border-slate-200 rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-inner">
                🔒
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-white tracking-tight">Fiók Regisztráció</CardTitle>
                <CardDescription className="text-violet-100 text-xs mt-1">
                  Hozz létre ingyenes fiókot generált anonim becenévvel és maximális adatvédelemmel!
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {successMessage ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center text-2xl shadow-lg">
                  ✓
                </div>
                <h3 className="text-xl font-extrabold text-emerald-900">{successMessage}</h3>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  A fiókod létrejött. Kattints az alábbi gombra az e-mail megerősítés szimulálásához és a bejelentkezéshez.
                </p>
                {activationToken && (
                  <Button
                    onClick={() => {
                      verifyEmailWithToken(activationToken);
                      navigate("/beauty");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6"
                  >
                    ✉️ E-mail megerősítése & Belépés
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                {formError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="text-xs font-bold mb-1.5 block text-slate-800">E-mail cím *</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="valodi.email@domain.hu"
                    className="text-xs rounded-xl"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Az e-mail címedet SOHA nem jelenítjük meg nyilvánosan.
                  </span>
                </div>

                {/* Real Name */}
                <div>
                  <label className="text-xs font-bold mb-1.5 block text-slate-800">Valódi Név (Opcionális / Nem Publikus)</label>
                  <Input
                    type="text"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    placeholder="pl. Kovács Katalin"
                    className="text-xs rounded-xl"
                  />
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Kizárólag számlázáshoz és ügyfélszolgálathoz!
                  </span>
                </div>

                {/* Generated Nickname Section */}
                <div className="p-5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-violet-900 dark:text-violet-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-600" /> Generált Nyilvános Becenév (Nickname) *
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const existingNicks = users.map((u) => u.nickname);
                        setGeneratedNicknames(generateRandomNicknames(realName, email, existingNicks));
                      }}
                      className="h-7 text-[11px] font-bold text-violet-700 hover:bg-violet-200/60 rounded-xl"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Újakat kérek 🔄
                    </Button>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Válassz a felkínált anonim becenevekből, vagy hozz létre sajátot!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                          className={`p-3 rounded-xl border text-xs font-black text-center transition cursor-pointer flex items-center justify-between ${
                            isSel
                              ? "bg-violet-600 text-white border-violet-600 shadow-md scale-105"
                              : "bg-white dark:bg-slate-900 border-slate-200 hover:border-violet-400 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          <span className="truncate">@{nick}</span>
                          {isSel && <Check className="w-4 h-4 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Nickname Input */}
                  <div className="pt-2">
                    <label className="text-xs font-bold block mb-1 text-slate-800">VAGY saját becenév megadása:</label>
                    <Input
                      type="text"
                      value={customNickname}
                      onChange={(e) => setCustomNickname(e.target.value)}
                      placeholder="pl. Roka_Vandor_99 (3-20 kar.)"
                      className="text-xs bg-white dark:bg-slate-900 rounded-xl"
                    />
                    {nicknameError ? (
                      <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {nicknameError}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Engedélyezett: betűk, számok, _ és -. Nem tartalmazhatja a valódi neved vagy az email címed!
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border text-xs font-bold text-violet-800 dark:text-violet-300 flex items-center justify-between">
                    <span>Nyilvános Azonosítód az oldalon:</span>
                    <Badge className="bg-violet-600 text-white font-black text-sm px-3 py-1">
                      @{activeNickname}
                    </Badge>
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold mb-1.5 block text-slate-800">Jelszó *</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="text-xs rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1.5 block text-slate-800">Jelszó megerősítése *</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="text-xs rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* Password Validation Hints */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border text-xs space-y-1.5 font-semibold text-slate-600 dark:text-slate-300">
                  <div className={password.length >= 8 ? "text-emerald-600 font-bold flex items-center gap-1.5" : ""}>
                    <span>{password.length >= 8 ? "✓" : "○"}</span> Legalább 8 karakter hosszúság
                  </div>
                  <div className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? "text-emerald-600 font-bold flex items-center gap-1.5" : ""}>
                    <span>{/[A-Z]/.test(password) && /[a-z]/.test(password) ? "✓" : "○"}</span> Legalább egy nagybetű (A-Z) és kisbetű (a-z)
                  </div>
                  <div className={/[0-9]/.test(password) ? "text-emerald-600 font-bold flex items-center gap-1.5" : ""}>
                    <span>{/[0-9]/.test(password) ? "✓" : "○"}</span> Legalább egy szám (0-9)
                  </div>
                  <div className={password && password === confirmPassword ? "text-emerald-600 font-bold flex items-center gap-1.5" : ""}>
                    <span>{password && password === confirmPassword ? "✓" : "○"}</span> Jelszó megerősítése egyezik
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2.5 pt-3 border-t">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                      Elfogadom az <a href="/gyik" target="_blank" className="text-violet-600 underline font-black">Általános Szerződési Feltételeket (ÁSZF)</a> *
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                      Elfogadom az <a href="/gyik" target="_blank" className="text-violet-600 underline font-black">Adatvédelmi Tájékoztatót</a> *
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm shadow-xl py-6"
                >
                  🚀 Regisztráció És Fiók Létrehozása
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
