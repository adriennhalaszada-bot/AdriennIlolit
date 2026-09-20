import { Layout } from "@/components/layout/Layout";
import { getGetConversationQueryKey, getGetConversationsQueryKey, getGetListingQueryKey, useCreateConversation, useGetConversation, useGetListing, useMarkConversationRead, useSendMessage } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { useLocation, useParams } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { MessageCircle, AlertTriangle, ArrowLeft, Loader2, Send } from "lucide-react";

export function Chat() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState("");
  const isNew = id === "new";
  const listingId = isNew ? new URLSearchParams(window.location.search).get("listingId") || "" : "";
  
  const { data: conv, isLoading, isError: isConversationError } = useGetConversation(id || "", {
    query: { enabled: !!id && !isNew, queryKey: getGetConversationQueryKey(id || "") }
  });
  const { data: listing, isLoading: isListingLoading, isError: isListingError } = useGetListing(listingId, {
    query: { enabled: isNew && !!listingId, queryKey: getGetListingQueryKey(listingId) },
  });
  
  const send = useSendMessage();
  const createConversation = useCreateConversation();
  const markRead = useMarkConversationRead();

  useEffect(() => {
    if (!isNew && id && conv && Number(conv.unreadCount) > 0 && !markRead.isPending) {
      markRead.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() }),
      });
    }
  }, [conv?.id, conv?.unreadCount, id, isNew]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages?.length]);

  const handleStartConversation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!listingId || !content.trim()) return;
    createConversation.mutate({ data: { listingId, message: content.trim() } }, {
      onSuccess: (created) => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        setLocation(`/messages/${created.id}`);
      },
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    send.mutate(
      { id: id!, data: { content, contentType: "text" } },
      {
        onSuccess: () => {
          setContent("");
          queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(id!) });
        }
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl h-[calc(100vh-8rem)] flex flex-col">
        {isNew ? (
          <Card className="mx-auto w-full max-w-xl rounded-3xl p-6 sm:p-8">
            <Button type="button" variant="ghost" size="sm" onClick={() => window.history.back()} className="mb-5 -ml-2 rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" /> Vissza a hirdetéshez
            </Button>
            {isListingLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Hirdetés betöltése…</div>
            ) : isListingError || !listingId || !listing ? (
              <div className="py-12 text-center"><h1 className="font-extrabold text-rose-700">A hirdetés nem található</h1><p className="mt-2 text-sm text-muted-foreground">Nyisd meg újra a hirdetést, majd válaszd az üzenetküldést.</p></div>
            ) : (
              <>
                <div className="mb-5 flex items-center gap-4 border-b pb-5">
                  {listing.images?.[0]?.url && <img src={listing.images[0].url} alt="" className="h-16 w-16 rounded-xl object-cover" />}
                  <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Új beszélgetés</p><h1 className="text-lg font-extrabold">{listing.title}</h1></div>
                </div>
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><p>Biztonsági okból ne küldj jelszót, bankkártyaadatot vagy belépési kódot.</p>
                </div>
                <form onSubmit={handleStartConversation} className="space-y-4">
                  <Textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={6} placeholder="Írd meg, mit szeretnél kérdezni a hirdetésről…" className="rounded-2xl" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{content.length}/2000 karakter</span></div>
                  {createConversation.isError && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{createConversation.error instanceof Error ? createConversation.error.message : "Az üzenet elküldése nem sikerült."}</p>}
                  <Button type="submit" disabled={!content.trim() || createConversation.isPending} className="w-full rounded-xl bg-emerald-600 py-5 font-extrabold text-white hover:bg-emerald-700">
                    {createConversation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Beszélgetés indítása
                  </Button>
                </form>
              </>
            )}
          </Card>
        ) : isLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Beszélgetés betöltése…</div>
        ) : isConversationError || !conv ? (
          <Card className="mx-auto mt-10 w-full max-w-lg rounded-3xl p-10 text-center"><h1 className="font-extrabold text-rose-700">A beszélgetés nem nyitható meg</h1><p className="mt-2 text-sm text-muted-foreground">Lehet, hogy a beszélgetés nem létezik, vagy nincs hozzáférésed.</p><Button onClick={() => setLocation("/messages")} variant="outline" className="mt-5 rounded-xl">Vissza az üzenetekhez</Button></Card>
        ) : (
          <>
            <div className="mb-4 pb-4 border-b flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <h1 className="font-bold text-lg">{conv?.listing?.title}</h1>
            </div>

            {/* ⚠️ Personal data warning */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <p>
                <strong>Figyelem:</strong> Tilos telefonszámot, e-mail címet, lakcímet vagy más személyes elérhetőséget megadni! Minden kommunikációt a Lolit platformon belül bonyolíts le. Személyes adatok megadása esetén a beszélgetés automatikusan blokkolásra kerülhet.
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {conv?.messages?.map(msg => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                    msg.senderId === user?.id
                      ? "bg-primary text-primary-foreground ml-auto rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {send.isError && <p className="mb-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{send.error instanceof Error ? send.error.message : "Az üzenetet nem sikerült elküldeni."}</p>}
            <form onSubmit={handleSend} className="flex gap-2">
              <Input 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                maxLength={2000}
                placeholder="💬 Írj üzenetet..." 
                className="flex-1 rounded-full"
              />
              <Button type="submit" disabled={send.isPending || !content.trim()} size="icon" className="rounded-full h-10 w-10 flex-shrink-0">
                {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
}
