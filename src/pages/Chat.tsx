import { Layout } from "@/components/layout/Layout";
import { useGetConversation, getGetConversationQueryKey, useSendMessage } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { MessageCircle, AlertTriangle, Send } from "lucide-react";

export function Chat() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState("");
  
  const { data: conv, isLoading } = useGetConversation(id || "", {
    query: { enabled: !!id, queryKey: getGetConversationQueryKey(id || "") }
  });
  
  const send = useSendMessage();

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
        {isLoading ? (
          <div>Betöltés...</div>
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
                    msg.senderId === conv.buyerId
                      ? "bg-primary text-primary-foreground ml-auto rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="flex gap-2">
              <Input 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder="💬 Írj üzenetet..." 
                className="flex-1 rounded-full"
              />
              <Button type="submit" disabled={send.isPending} size="icon" className="rounded-full h-10 w-10 flex-shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
}
