import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useGetConversations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { useUserAccountStore } from "@/lib/userAccountStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { MessageSquare, User, Briefcase, Mail, Sparkles } from "lucide-react";

export function Messages() {
  let user: any = null;
  try {
    const userRes = useUser();
    user = userRes?.user;
  } catch (e) {
    user = null;
  }
  const { currentUser, activeProfile } = useUserAccountStore();
  const { data, isLoading } = useGetConversations();
  const [inboxFilter, setInboxFilter] = useState<"all" | "private" | "business">("all");

  const mockConversations = [
    {
      id: "conv-beauty-1",
      targetProfile: "business",
      otherUser: { name: "Kiss Mária", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100", role: "Vendég" },
      lastMessage: "Jó napot kívánok! Szeretnék érdeklődni, hogy csütörtökön 14:00-kor van-e szabad hely balayage festésre?",
      lastMessageAt: "10:45",
      unread: true,
      listingTitle: "Balayage Festés & Ápolás",
    },
    {
      id: "conv-private-1",
      targetProfile: "private",
      otherUser: { name: "Kovács Ádám (BátorLovag)", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", role: "Vásárló" },
      lastMessage: "Szia! Érdeklődnék a vintage bőrdzseki iránt. Elérhető még, és személyesen átvehető Budapesten?",
      lastMessageAt: "Tegnap",
      unread: false,
      listingTitle: "Vintage Bőrdzseki L-es",
    },
    {
      id: "conv-beauty-2",
      targetProfile: "business",
      otherUser: { name: "Nagy Gábor", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", role: "Vendég" },
      lastMessage: "Köszönöm a visszajelzést, ott leszek időben!",
      lastMessageAt: "Tegnap",
      unread: false,
      listingTitle: "Női & Férfi Hajvágás",
    },
  ];

  const filteredConversations = mockConversations.filter((c) => {
    if (inboxFilter === "private") return c.targetProfile === "private";
    if (inboxFilter === "business") return c.targetProfile === "business";
    return true;
  });

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
              Összes Postaláda ({mockConversations.length})
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
          {filteredConversations.map((conv) => {
            const isBusinessTarget = conv.targetProfile === "business";
            return (
              <Card
                key={conv.id}
                className={`p-4 rounded-2xl border transition hover:shadow-md ${
                  conv.unread
                    ? "bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 border-2 border-slate-200">
                    <AvatarImage src={conv.otherUser.avatar} />
                    <AvatarFallback>{conv.otherUser.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {conv.otherUser.name}
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
                      <span className="text-xs text-muted-foreground font-semibold">{conv.lastMessageAt}</span>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 truncate">{conv.listingTitle}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1">{conv.lastMessage}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
