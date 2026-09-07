import { useState } from "react";
import { Mail, Sparkles, CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useUserAccountStore } from "@/lib/userAccountStore";
import { useToast } from "@/hooks/use-toast";

export function BeautyNewsletterWidget() {
  const { currentUser, newsletterSubscribers, toggleNewsletterSubscription } = useUserAccountStore();
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState(currentUser?.email || "");
  const [subscribed, setSubscribed] = useState(
    currentUser?.email ? newsletterSubscribers.includes(currentUser.email.toLowerCase()) : false
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) return;

    const isSubbed = toggleNewsletterSubscription(cleanEmail);
    setSubscribed(isSubbed);

    if (isSubbed) {
      toast({
        title: "🎉 Sikeres Hírlevél Feliratkozás!",
        description: `${cleanEmail} feliratkozott a szépségipari akciókra és hírekre.`,
      });
    } else {
      toast({
        title: "Hírlevél leiratkozás megtörtént",
        description: `${cleanEmail} leiratkozott a hírlevélről.`,
      });
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-violet-950 via-slate-900 to-purple-950 border-2 border-violet-500/30 text-white rounded-3xl shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Sparkles className="w-32 h-32 text-violet-400" />
      </div>

      <div className="max-w-xl mx-auto text-center space-y-4 relative z-10">
        <div className="inline-flex items-center gap-1.5 bg-violet-500/20 text-violet-300 text-xs font-black px-3.5 py-1.5 rounded-full border border-violet-500/30">
          <Mail className="w-4 h-4 text-violet-400" /> 6.3. Szépségápolási Hírlevél & Exkluzív Akciók
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white">
          Iratkozz fel a szépségápolási hírekre és exkluzív kuponokra!
        </h3>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Elsőként értesülhetsz a kiemelt szalonok szabad időpontjairól, a szezonális kedvezményekről és az első látogatói promóciókról.
        </p>

        {subscribed ? (
          <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Feliratkozva a hírlevélre: <strong className="text-white">{emailInput}</strong></span>
            <button
              onClick={handleSubmit}
              className="text-[11px] text-emerald-400 hover:text-white underline ml-2 cursor-pointer"
            >
              (Leiratkozás)
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto pt-2">
            <Input
              type="email"
              placeholder="Adja meg az e-mail címét..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="bg-slate-900/90 border-violet-500/40 text-white placeholder:text-slate-400 text-xs rounded-xl h-11 flex-1 font-semibold"
            />
            <Button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold h-11 px-6 rounded-xl text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Gift className="w-4 h-4" /> Feliratkozás →
            </Button>
          </form>
        )}

        <p className="text-[10px] text-slate-400 font-medium">
          A feliratkozással elfogadod az Adatvédelmi Nyilatkozatot. Bármikor leiratkozhatsz 1 kattintással.
        </p>
      </div>
    </Card>
  );
}
