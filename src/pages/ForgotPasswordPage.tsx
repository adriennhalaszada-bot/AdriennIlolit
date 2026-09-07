import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { useUserAccountStore, validatePasswordFormat } from "@/lib/userAccountStore";
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Mail, Lock } from "lucide-react";

export function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { requestPasswordReset, resetPasswordWithToken } = useUserAccountStore();

  // Extract token from query params if coming from email link ?token=...
  const [tokenParam, setTokenParam] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get("token");
    if (tok) {
      setTokenParam(tok);
    }
  }, []);

  // Request Reset State
  const [email, setEmail] = useState("");
  const [requestSentMessage, setRequestSentMessage] = useState("");
  const [demoToken, setDemoToken] = useState("");

  // Reset Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setRequestSentMessage("");

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Kérjük adj meg egy érvényes e-mail címet!");
      return;
    }

    // Generic response to prevent user enumeration attacks
    const res = requestPasswordReset(email);
    setRequestSentMessage(res.message);

    if (res.tokenForDemo) {
      setDemoToken(res.tokenForDemo);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setResetSuccessMessage("");

    if (!tokenParam) {
      setErrorMessage("Hiányzó vagy érvénytelen visszaállító token!");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage("A megadott jelszavak nem egyeznek meg!");
      return;
    }

    const pwdCheck = validatePasswordFormat(newPassword);
    if (!pwdCheck.valid) {
      setErrorMessage(pwdCheck.error || "Hibás jelszó formátum!");
      return;
    }

    const res = resetPasswordWithToken(tokenParam, newPassword);
    if (!res.success) {
      setErrorMessage(res.error || "Sikertelen jelszó-visszaállítás!");
      return;
    }

    setResetSuccessMessage("A jelszavad sikeresen megváltozott! Az összes meglévő munkamenetet kijelentkeztettük.");
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-xl">
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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-inner">
                🔑
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-white tracking-tight">
                  {tokenParam ? "Új Jelszó Beállítása" : "Elfelejtett Jelszó"}
                </CardTitle>
                <CardDescription className="text-violet-100 text-xs mt-1">
                  {tokenParam
                    ? "Add meg az új biztonságos jelszavadat a fiókodhoz!"
                    : "Adj meg az e-mail címedet, és küldünk egy biztonságos visszaállító hivatkozást."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ── MODE A: TOKEN IN URL (RESET PASSWORD) ── */}
            {tokenParam ? (
              resetSuccessMessage ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
                  <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
                  <h3 className="text-xl font-extrabold text-emerald-900">{resetSuccessMessage}</h3>
                  <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                    Most már bejelentkezhetsz az új jelszavaddal!
                  </p>
                  <Button
                    onClick={() => navigate("/beauty")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6"
                  >
                    🔑 Bejelentkezés a Fiókba
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold mb-1.5 block text-slate-800">Új Jelszó *</label>
                    <div className="relative">
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="text-xs rounded-xl pl-9"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold mb-1.5 block text-slate-800">Új Jelszó Megerősítése *</label>
                    <div className="relative">
                      <Input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="text-xs rounded-xl pl-9"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* Password Hints */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border text-xs space-y-1.5 font-semibold text-slate-600">
                    <div className={newPassword.length >= 8 ? "text-emerald-600 font-bold flex items-center gap-1.5" : ""}>
                      <span>{newPassword.length >= 8 ? "✓" : "○"}</span> Legalább 8 karakter hosszúság
                    </div>
                    <div className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "text-emerald-600 font-bold flex items-center gap-1.5" : ""}>
                      <span>{/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "✓" : "○"}</span> Legalább egy nagybetű (A-Z) és kisbetű (a-z)
                    </div>
                    <div className={/[0-9]/.test(newPassword) ? "text-emerald-600 font-bold flex items-center gap-1.5" : ""}>
                      <span>{/[0-9]/.test(newPassword) ? "✓" : "○"}</span> Legalább egy szám (0-9)
                    </div>
                    <div className={newPassword && newPassword === confirmNewPassword ? "text-emerald-600 font-bold flex items-center gap-1.5" : ""}>
                      <span>{newPassword && newPassword === confirmNewPassword ? "✓" : "○"}</span> Jelszó megerősítése egyezik
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm shadow-xl py-6"
                  >
                    💾 Új Jelszó Mentése
                  </Button>
                </form>
              )
            ) : (
              /* ── MODE B: REQUEST RESET EMAIL ── */
              requestSentMessage ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-4">
                  <Mail className="w-14 h-14 text-violet-600 mx-auto" />
                  <h3 className="text-lg font-extrabold text-slate-900">{requestSentMessage}</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    A biztonsági token 45 percig érvényes. Ellenőrizd a fiókodat!
                  </p>
                  {demoToken && (
                    <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl text-left space-y-2">
                      <span className="text-[11px] font-bold text-violet-800 block uppercase">
                        🧪 Teszt Szimulációs Hivatkozás:
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setTokenParam(demoToken);
                        }}
                        className="w-full bg-violet-600 text-white font-bold text-xs rounded-lg"
                      >
                        🔗 Kattints ide az új jelszó megadásához
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold mb-1.5 block text-slate-800">E-mail cím *</label>
                    <div className="relative">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="valodi.email@domain.hu"
                        className="text-xs rounded-xl pl-9"
                        required
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Biztonsági okokból mindig azonos visszajelzést adunk az e-mail címek védelme érdekében.
                  </p>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm shadow-xl py-6"
                  >
                    ✉️ Jelszó-visszaállító Link Küldése
                  </Button>
                </form>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
