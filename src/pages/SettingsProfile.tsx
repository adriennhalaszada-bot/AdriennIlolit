import { Layout } from "@/components/layout/Layout";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "same";

import { ProfileSwitcher } from "@/components/profile/ProfileSwitcher";
import { GDPRDeleteModal } from "@/components/profile/GDPRDeleteModal";
import { useUserAccountStore } from "@/lib/userAccountStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, Sparkles, Shield, Lock, Cloud, Trash2 } from "lucide-react";

export function SettingsProfile() {
  const { currentUser, activeProfile } = useUserAccountStore();
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"private" | "business">("private");

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setBio(user.bio || "");
      setLocation(user.location || "");
    }
  }, [user]);

  const checkAvailability = useCallback(
    debounce(async (val: string, currentUsername: string) => {
      if (!val) { setUsernameStatus("idle"); return; }
      if (val === currentUsername) { setUsernameStatus("same"); return; }
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(val)) { setUsernameStatus("invalid"); return; }
      setUsernameStatus("checking");
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(val)}`);
        setUsernameStatus(res.status === 404 ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400),
    [],
  );

  useEffect(() => {
    if (!newUsername.trim()) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    checkAvailability(newUsername.trim(), user?.username ?? "");
  }, [newUsername, user?.username]);

  const cooldownInfo = (() => {
    if (!(user as any)?.usernameChangedAt) return null;
    const ref = new Date((user as any).usernameChangedAt);
    const daysSince = (Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 30) return null;
    return Math.ceil(30 - daysSince);
  })();

  const canSaveUsername =
    newUsername.trim() !== "" &&
    usernameStatus === "available" &&
    !isSavingUsername &&
    cooldownInfo === null;

  const handleSaveProfile = () => {
    updateMe.mutate({ data: { fullName, bio, location } }, {
      onSuccess: () => {
        toast({ title: "Sikeres mentés" });
      }
    });
  };

  const handleSaveUsername = async () => {
    if (!canSaveUsername) return;
    setIsSavingUsername(true);
    try {
      await updateMe.mutateAsync({ data: { username: newUsername.trim() } });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setNewUsername("");
      setUsernameStatus("idle");
      toast({ title: "Felhasználónév módosítva!" });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Nem sikerült a módosítás. Próbáld újra!";
      toast({ title: "Hiba", description: msg, variant: "destructive" });
    } finally {
      setIsSavingUsername(false);
    }
  };

  const statusIcon = () => {
    if (usernameStatus === "checking") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (usernameStatus === "available") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (usernameStatus === "taken" || usernameStatus === "invalid") return <XCircle className="h-4 w-4 text-destructive" />;
    return null;
  };

  const statusText = () => {
    if (usernameStatus === "checking") return <span className="text-muted-foreground">Ellenőrzés...</span>;
    if (usernameStatus === "available") return <span className="text-emerald-600">Szabad!</span>;
    if (usernameStatus === "taken") return <span className="text-destructive">Ez a felhasználónév már foglalt</span>;
    if (usernameStatus === "invalid") return <span className="text-amber-500">3-30 karakter, csak betű, szám és _</span>;
    if (usernameStatus === "same") return <span className="text-muted-foreground">Ez már a jelenlegi neved</span>;
    return null;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <h1 className="text-2xl font-bold mb-8">Profil beállítások</h1>
        <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Általános adatok</h2>
              <div>
                <label className="text-sm font-medium">Teljes név</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Bemutatkozás</label>
                <Input value={bio} onChange={e => setBio(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Helyszín</label>
                <Input value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <Button onClick={handleSaveProfile} disabled={updateMe.isPending}>Mentés</Button>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold">Felhasználónév módosítása</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Jelenlegi neved: <span className="font-medium text-foreground">@{user?.username}</span>
                </p>
              </div>

              {cooldownInfo !== null ? (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    A felhasználónevet legkorábban <strong>{cooldownInfo} nap</strong> múlva módosíthatod.
                    (30 naponként egyszer változtatható)
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Új felhasználónév</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground select-none">@</span>
                    <Input
                      className="pl-7 pr-9"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      placeholder={user?.username ?? ""}
                      maxLength={30}
                      autoComplete="off"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {statusIcon()}
                    </span>
                  </div>
                  {newUsername.trim() !== "" && (
                    <p className="text-xs">{statusText()}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    3-30 karakter, csak betűk, számok és _ (aláhúzás). 30 naponként egyszer módosítható.
                  </p>
                  <Button
                    onClick={handleSaveUsername}
                    disabled={!canSaveUsername}
                    className="mt-1"
                  >
                    {isSavingUsername ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mentés...</>
                    ) : "Felhasználónév mentése"}
                  </Button>
                </div>
              )}

              {/* GDPR Veszélyzóna */}
              <div className="mt-10 p-5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 space-y-3">
                <h4 className="font-extrabold text-sm text-red-600 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  Veszélyzóna – Fiók végleges törlése (GDPR)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ha már nem szeretnéd használni az Ilolit szolgáltatást, véglegesen törölheted a fiókodat és az összes személyes adatodat.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="text-xs font-bold rounded-xl h-9"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Fiók és adatok törlése
                </Button>
              </div>

              <GDPRDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirmDelete={() => {
                  window.location.href = "/";
                }}
              />
            </div>
          </div>
      </div>
    </Layout>
  );
}
