import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { getGetConversationsQueryKey, useGetConversations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { useUserAccountStore } from "@/lib/userAccountStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, MessageSquare } from "lucide-react";

export function Messages() {
  let user: any = null;
  try {
    const userRes = useUser();
    user = userRes?.user;
  } catch (e) {
    user = null;
  }
  const { activeProfile } = useUserAccountStore();
  const { data = [], isLoading, isError } = useGetConversations({ query: { enabled: !!user, queryKey: getGetConversationsQueryKey() } });
  const [inboxFilter, setInboxFilter] = useState<"all" | "private" | "business">("all");

  const filteredConversations = data.filter((conversation) => {
    const target = conversation.sellerId === user?.id ? "business" : "private";
    if (inboxFilter === "private") return target === "private";
    if (inboxFilter === "business") return target === "business";
    return true;
  });

  const formatTime = (value?: string | null) => value
    ? new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
    : "";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-2xl">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500 text-white font-bold text-[10px]">Közös Postaláda</Badge>
                <Badge variant="outline" className="text-slate-300 border-slate-700 text-[10px]">
                  Aktív nézet: {activeProfile === "business" ? "💼 Vállalkozói" : "👤 Magán"}
                </Badge>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Üzenetek & Megkeresések</h1>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-xs">
            Mindkét profilod üzenetei egy helyen jelennek meg, címkézve, függetlenül attól, hogy melyik nézetben vagy!
          </p>
        </div>

        {/* Filter Tabs */}
        <Tabs value={inboxFilter} onValueChange={(v: any) => setInboxFilter(v)} className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <TabsTrigger value="all" className="rounded-xl text-xs font-bold">
              Összes Postaláda ({data.length})
            </TabsTrigger>
            <TabsTrigger value="private" className="rounded-xl text-xs font-bold">
              👤 Magán Üzenetek
            </TabsTrigger>
            <TabsTrigger value="business" className="rounded-xl text-xs font-bold">
              💼 Vállalkozói Megkeresések
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Conversation List */}
        <div className="space-y-3">
          {isLoading && <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Beszélgetések betöltése…</div>}
          {isError && <Card className="p-8 text-center text-sm text-rose-700">A beszélgetések most nem tölthetők be. Frissítsd az oldalt, vagy jelentkezz be újra.</Card>}
          {!isLoading && !isError && filteredConversations.length === 0 && (
            <Card className="p-10 text-center"><MessageSquare className="mx-auto mb-3 h-9 w-9 text-slate-400" /><h2 className="font-extrabold">Még nincs beszélgetésed</h2><p className="mt-1 text-xs text-muted-foreground">Egy hirdetés oldaláról küldött első üzenet itt fog megjelenni.</p></Card>
          )}
          {filteredConversations.map((conv) => {
            const isBusinessTarget = conv.sellerId === user?.id;
            const otherUser = isBusinessTarget ? conv.buyer : conv.seller;
            const otherName = otherUser?.fullName || otherUser?.username || "ILOLIT felhasználó";
            return (
              <Link href={`/messages/${conv.id}`}><Card
                key={conv.id}
                className={`p-4 rounded-2xl border transition hover:shadow-md ${
                  Number(conv.unreadCount) > 0
                    ? "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 border-2 border-slate-200">
                    <AvatarImage src={otherUser?.avatarUrl || undefined} />
                    <AvatarFallback>{otherName[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {otherName}
                        </span>
                        <Badge
                          className={`text-[10px] font-bold ${
                            isBusinessTarget
                              ? "bg-rose-500 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {isBusinessTarget ? "💼 VÁLLALKOZÓI" : "👤 PRIVÁT"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold">{formatTime(conv.lastMessageAt)}</span>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 truncate">{conv.listing?.title || "Hirdetés"}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1">{conv.lastMessage?.content || "Beszélgetés elindítva"}</p>
                  </div>
                </div>
              </Card></Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
