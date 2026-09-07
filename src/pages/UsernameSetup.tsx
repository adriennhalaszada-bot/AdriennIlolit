import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useGetUsernameSuggestions, useSetUsername, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, RefreshCw, Sparkles } from "lucide-react";

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function UsernameSetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Escape hatch: leave /username-setup if user already has a username OR if
  // the API is unreachable (auth error) — the DB is fixed so letting them
  // through is always safe.
  const { data: me, isSuccess: meLoaded, isError: meError } = useGetMe({
    query: { queryKey: getGetMeQueryKey() },
  });
  useEffect(() => {
    if ((meLoaded && me?.usernameSet === true) || meError) {
      navigate("/");
    }
  }, [meLoaded, me?.usernameSet, meError]);

  const { data: suggestionsData, isLoading: loadingSuggestions, refetch: refetchSuggestions } =
    useGetUsernameSuggestions();

  const setUsernameMutation = useSetUsername();

  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [customStatus, setCustomStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  const activeUsername = custom.trim() !== "" ? custom.trim() : selected;

  const checkAvailability = useCallback(
    debounce(async (val: string) => {
      if (!val || val.trim().length === 0) { setCustomStatus("idle"); return; }
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(val)) { setCustomStatus("invalid"); return; }
      setCustomStatus("checking");
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(val)}`);
        setCustomStatus(res.status === 404 ? "available" : "taken");
      } catch {
        setCustomStatus("idle");
      }
    }, 400),
    [],
  );

  useEffect(() => {
    if (custom.trim()) {
      setCustomStatus("checking");
      checkAvailability(custom.trim());
    } else {
      setCustomStatus("idle");
    }
  }, [custom]);

  async function handleSave() {
    const username = activeUsername;
    if (!username) return;
    try {
      await setUsernameMutation.mutateAsync({ data: { username } });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Felhasználónév beállítva!", description: `@${username}` });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Hiba",
        description: err?.response?.data?.error ?? "Nem sikerült a mentés",
        variant: "destructive",
      });
    }
  }

  const canSave = (() => {
    if (custom.trim()) return customStatus === "available";
    return !!selected;
  })();

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Válassz felhasználónevet!</h1>
          <p className="text-muted-foreground text-sm">
            Ez lesz a nyilvános azonosítód a Loloit piactéren.<br />
            Valódi neved nem jelenik meg másoknak.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Javasolt nevek</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchSuggestions()}
              disabled={loadingSuggestions}
              className="text-xs gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingSuggestions ? "animate-spin" : ""}`} />
              Új javaslatok
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {loadingSuggestions
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
                ))
              : (suggestionsData?.suggestions ?? []).map((name) => (
                  <button
                    key={name}
                    onClick={() => { setSelected(name); setCustom(""); }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-mono transition-all ${
                      selected === name && custom === ""
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-muted-foreground mr-1">@</span>
                    {name}
                    {selected === name && custom === "" && (
                      <CheckCircle className="inline w-4 h-4 text-primary ml-2" />
                    )}
                  </button>
                ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Vagy írj sajátot</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input
              value={custom}
              onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
              placeholder="sajat_nev_42"
              className="pl-7 font-mono"
              maxLength={30}
            />
          </div>
          {custom.trim() && (
            <p className={`text-xs ${
              customStatus === "available" ? "text-emerald-600" :
              customStatus === "taken" ? "text-red-500" :
              customStatus === "invalid" ? "text-amber-500" :
              "text-muted-foreground"
            }`}>
              {customStatus === "checking" && "Ellenőrzés..."}
              {customStatus === "available" && "✓ Szabad!"}
              {customStatus === "taken" && "✗ Ez a név már foglalt"}
              {customStatus === "invalid" && "3-30 karakter, csak betű, szám és _ engedélyezett"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            3-30 karakter, csak betűk, számok és _ (aláhúzás)
          </p>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleSave}
          disabled={!canSave || setUsernameMutation.isPending}
        >
          {setUsernameMutation.isPending ? "Mentés..." : "Tovább a Loloitra →"}
        </Button>
      </div>
    </div>
  );
}
