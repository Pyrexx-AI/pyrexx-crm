"use client";
import React, { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, Send, Paperclip, FileText, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

interface InboxThreadProps {
  threadId: string;
  contactId: string;
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
  const [htmlReply, setHtmlReply] = useState("");
  const [textReply, setTextReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<{ filename: string; path: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editorKey, setEditorKey] = useState(0); // Force Tiptap reset
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (isMounted && data) setMessages(data);
    };

    fetchMessages();
    supabase.from("threads").update({ is_unread: false }).eq("id", threadId).then();
    
    const channel = supabase
      .channel("messages_channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { 
      isMounted = false; 
      supabase.removeChannel(channel); 
    };
  }, [threadId, supabase]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newAttachments = [...attachments];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'file';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${orgId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
      
      if (!uploadError) {
        const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
        newAttachments.push({ filename: file.name, path: data.publicUrl });
      } else {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setAttachments(newAttachments);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!textReply.trim() && attachments.length === 0) return;
    setIsSending(true);

    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: orgId,
        contact_id: contactId,
        sender_id: userId,
        to: contactEmail,
        content: textReply,
        htmlContent: htmlReply,
        attachments: attachments,
        from_slug: orgSlug
      })
    });

    if (res.ok) {
      setHtmlReply("");
      setTextReply("");
      setAttachments([]);
      setEditorKey(prev => prev + 1); // Forcibly clears uncontrolled Tiptap instance
    } else {
      toast.error("Failed to send email");
    }
    setIsSending(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-paper relative">
      <div className="px-4 md:px-8 py-4 flex items-center gap-3 border-b border-line bg-paper z-10 flex-shrink-0">
        <button onClick={onBack} className="md:hidden text-ink">
          <ChevronLeft size={18} />
        </button>
        <Avatar name={contactName} size={32} />
        <div>
          <div className="text-sm font-medium text-ink font-body">{contactName}</div>
          <div className="text-xs text-slate font-body">{contactEmail}</div>
        </div>
      </div>

      <div className="flex-1 px-4 md:px-8 py-6 space-y-4 overflow-y-auto min-h-0">
        {messages.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          return (
            <div key={msg.id} className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}>
              <div 
                className={`max-w-md w-full rounded-xl p-4 text-sm font-body ${
                  isOutbound 
                    ? "bg-ink text-paper rounded-tr-sm" 
                    : "bg-white text-ink rounded-tl-sm border border-line shadow-sm"
                }`}
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: msg.content }} 
                  className={`prose prose-sm max-w-none ${isOutbound ? 'prose-invert' : ''} [&>p]:m-0 [&>p]:mb-2 last:[&>p]:mb-0`} 
                />

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className={`mt-3 pt-3 border-t flex flex-col gap-2 ${isOutbound ? 'border-inkSoft' : 'border-line'}`}>
                    {msg.attachments.map((att: any, i: number) => (
                      <a 
                        key={i} 
                        href={att.path} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`flex items-center gap-2 text-xs p-2 rounded-lg transition-colors ${
                          isOutbound ? 'bg-inkSoft hover:bg-ink600 text-paper' : 'bg-paperDim hover:bg-[#E0DFDA] text-ink'
                        }`}
                      >
                        <FileText size={14} className={isOutbound ? 'text-slate' : 'text-berry'} />
                        <span className="truncate">{att.filename}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate font-mono mt-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="px-4 md:px-8 py-4 border-t border-line bg-paper flex-shrink-0">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 bg-white border border-line px-2 py-1.5 rounded-md text-xs font-body text-ink shadow-sm">
                <FileText size={12} className="text-berry" />
                <span className="max-w-[120px] truncate">{att.filename}</span>
                <button onClick={() => removeAttachment(i)} className="text-slate hover:text-berry ml-1">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <RichTextEditor 
              key={editorKey}
              content={htmlReply} 
              onChange={(html, text) => { setHtmlReply(html); setTextReply(text); }} 
            />
          </div>
          
          <div className="flex flex-col gap-2 mb-1">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploading}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-line text-slate hover:text-ink hover:border-berry transition-colors shadow-sm disabled:opacity-50"
            >
              {isUploading ? <div className="w-4 h-4 border-2 border-slate border-t-transparent rounded-full animate-spin" /> : <Paperclip size={16} />}
            </button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || (!textReply.trim() && attachments.length === 0)} 
              className="w-10 h-10 rounded-full p-0 flex items-center justify-center shadow-sm"
            >
              <Send size={16} className={(textReply.trim() || attachments.length > 0) ? "translate-x-[1px] translate-y-[-1px]" : ""} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}