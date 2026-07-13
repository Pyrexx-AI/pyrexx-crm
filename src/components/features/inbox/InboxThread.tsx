"use client";
import React, { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

interface InboxThreadProps {
  threadId: string;
  contactId: string; // <-- Added to ensure new threads have a recipient
  contactName: string;
  contactEmail: string;
  orgId: string;
  orgSlug: string;
  onBack: () => void;
  userId: string;
}

export function InboxThread({ threadId, contactId, contactName, contactEmail, orgId, orgSlug, onBack, userId }: InboxThreadProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
    supabase.from("threads").update({ is_unread: false }).eq("id", threadId).then();
    
    const channel = supabase
      .channel("messages_channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setIsSending(true);

    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: orgId,
        contact_id: contactId, // <-- Uses explicit prop instead of relying on message history
        sender_id: userId,
        to: contactEmail,
        content: reply,
        from_slug: orgSlug
      })
    });

    if (res.ok) {
      setReply("");
      fetchMessages();
    } else {
      toast.error("Failed to send email");
    }
    setIsSending(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-paper relative">
      <div className="px-4 md:px-8 py-4 flex items-center gap-3 border-b border-line bg-paper z-10">
        <button onClick={onBack} className="md:hidden text-ink">
          <ChevronLeft size={18} />
        </button>
        <Avatar name={contactName} size={32} />
        <div>
          <div className="text-sm font-medium text-ink font-body">{contactName}</div>
          <div className="text-xs text-slate font-body">{contactEmail}</div>
        </div>
      </div>

      <div className="flex-1 px-4 md:px-8 py-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          return (
            <div key={msg.id} className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}>
              <div 
                className={`max-w-md rounded-xl p-3 text-sm font-body ${
                  isOutbound 
                    ? "bg-ink text-paper rounded-tr-sm" 
                    : "bg-paperDim text-ink rounded-tl-sm border border-line"
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-slate font-mono mt-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 md:px-8 py-4 flex items-center gap-3 border-t border-line bg-paper">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Reply via Email..."
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none bg-paperDim font-body text-ink border border-transparent focus:border-berry focus:bg-white resize-none max-h-32 min-h-[44px]"
          rows={1}
        />
        <Button onClick={handleSend} disabled={isSending || !reply.trim()} className="self-end rounded-full w-10 h-10 p-0 flex items-center justify-center">
          <Send size={16} className={reply.trim() ? "translate-x-[1px] translate-y-[-1px]" : ""} />
        </Button>
      </div>
    </div>
  );
}