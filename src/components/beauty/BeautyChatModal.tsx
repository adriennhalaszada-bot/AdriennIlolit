import { useState } from "react";
import { MessageSquare, ShieldCheck, X, Send, Lock, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUserAccountStore, maskContactInfo } from "@/lib/userAccountStore";

export interface BeautyChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
}

export function BeautyChatModal({ isOpen, onClose, recipientId, recipientName }: BeautyChatModalProps) {
  const { currentUser, chatMessages, sendBeautyMessage } = useUserAccountStore();
  const [inputText, setInputText] = useState("");
  const [showMaskWarning, setShowMaskWarning] = useState(false);

  if (!isOpen) return null;

  const currentUserId = currentUser?.id || "user-guest";
  const currentUserName = currentUser?.nickname || currentUser?.realName || "Vendég";

  // Filter messages between current user and target recipient
  const messages = chatMessages.filter(
    (m) =>
      (m.senderId === currentUserId && m.recipientId === recipientId) ||
      (m.senderId === recipientId && m.recipientId === currentUserId) ||
      (m.recipientName === recipientName || m.senderName === recipientName)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    const { isMasked } = maskContactInfo(val);
    setShowMaskWarning(isMasked);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendBeautyMessage(currentUserId, currentUserName, recipientId, recipientName, inputText);
    setInputText("");
    setShowMaskWarning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-violet-500/40 text-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-violet-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-500 flex items-center justify-center font-black text-white text-lg shadow-md">
              {recipientName[0]?.toUpperCase() || "S"}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-violet-200 flex items-center gap-2">
                <span>{recipientName}</span>
                <Badge className="bg-emerald-600 text-white text-[9px] font-bold">Online</Badge>
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> 6.1. Titkosított Privát Chat & Adatvédelem
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy Callout Banner */}
        <div className="px-4 py-2 bg-violet-950/40 border-b border-violet-500/20 flex items-center gap-2 text-[11px] text-violet-300 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Az e-mail címek és telefonszámok automatikusan maszkolva maradnak a védelmedben.</span>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
              <p className="text-xs font-semibold">Még nincs üzenetváltás {recipientName} szalonnal.</p>
              <p className="text-[11px] text-slate-500">Kérdezz bátran a kezelésekről vagy az időpontokról!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === currentUserId || m.senderName === currentUserName;
              return (
                <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <div className="text-[10px] text-slate-400 font-bold mb-1 px-1">{m.senderName} · {m.timestamp}</div>
                  <div
                    className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed font-medium shadow-sm ${
                      isMine
                        ? "bg-violet-600 text-white rounded-tr-none"
                        : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                    }`}
                  >
                    <p>{m.content}</p>
                    {m.isMasked && (
                      <div className="mt-1.5 pt-1 border-t border-white/20 text-[10px] text-amber-300 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Elérhetőség maszkolva (Adatvédelem)
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mask Warning Indicator */}
        {showMaskWarning && (
          <div className="px-4 py-2 bg-amber-950/80 border-t border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 animate-pulse">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Az üzenetedben e-mail vagy telefonszám detektálva – az adatok maszkolásra kerülnek!</span>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <Input
            type="text"
            placeholder="Írj üzenetet a szolgáltatónak..."
            value={inputText}
            onChange={handleInputChange}
            className="flex-1 bg-slate-900 border-slate-700 text-white text-xs rounded-xl h-11 focus-visible:ring-violet-500"
          />
          <Button type="submit" disabled={!inputText.trim()} className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-11 px-4 rounded-xl cursor-pointer">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
