"use client";
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronLeft, Mail, Phone, Building2, CheckCircle2, Circle, Edit3, Trash2, X, Save } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { toast, Toaster } from "sonner";

export default function ContactDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { activeOrgId, userId, userRole } = useAppStore();
  
  const [contact, setContact] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (activeOrgId && id) fetchData();
  }, [activeOrgId, id]);

  const fetchData = async () => {
    const { data: contactData } = await supabase.from("contacts").select("*, deals(value)").eq("id", id).single();
    
    if (contactData) {
      const dealValue = contactData.deals?.reduce((sum: number, d: any) => sum + Number(d.value), 0) || 0;
      setContact({ ...contactData, total_value: dealValue });
      setEditForm({
        first_name: contactData.first_name || "",
        last_name: contactData.last_name || "",
        email: contactData.email || "",
        phone: contactData.phone || ""
      });
    } else {
      toast.error("Contact not found");
      router.push("/contacts");
    }

    const { data: tasksData } = await supabase.from("tasks").select("*").eq("contact_id", id).eq("is_completed", false).order("due_date", { ascending: true });
    if (tasksData) setTasks(tasksData);

    const { data: activities } = await supabase.from("activities").select("*, users(full_name)").eq("contact_id", id);
    let mergedTimeline = (activities || []).map(a => ({
      id: a.id,
      date: new Date(a.created_at),
      type: a.type, 
      content: a.content,
      actor: a.users?.full_name || "System"
    }));

    mergedTimeline.sort((a, b) => b.date.getTime() - a.date.getTime());
    setTimeline(mergedTimeline);
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    const { error } = await supabase.from("contacts").update({
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      email: editForm.email,
      phone: editForm.phone,
      updated_at: new Date().toISOString()
    }).eq("id", id);

    setIsSavingEdit(false);
    if (error) {
      toast.error("Failed to update contact");
    } else {
      toast.success("Contact updated!");
      setIsEditing(false);
      fetchData();
    }
  };

  const handleDeleteContact = async () => {
    if (!window.confirm("Are you sure you want to delete this contact? This will permanently delete all their deals, tasks, and history.")) return;
    
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete contact");
    } else {
      toast.success("Contact deleted");
      router.push("/contacts");
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !activeOrgId || !userId) return;
    setIsSavingNote(true);
    const { error } = await supabase.from("activities").insert({ org_id: activeOrgId, contact_id: id, actor_id: userId, type: "note", content: noteContent });
    setIsSavingNote(false);
    if (error) toast.error("Failed to save note");
    else { toast.success("Note added"); setNoteContent(""); fetchData(); }
  };

  const toggleTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId)); 
    await supabase.from("tasks").update({ is_completed: true }).eq("id", taskId);
    toast.success("Task completed");
  };

  const handleEmailClick = async () => {
    if (!activeOrgId || !contact?.id) return;
    const { data: existingThread } = await supabase.from("threads").select("id").eq("org_id", activeOrgId).eq("contact_id", contact.id).eq("channel", "email").single();
    if (existingThread) {
      router.push(`/inbox?threadId=${existingThread.id}`);
    } else {
      const { data: newThread, error } = await supabase.from("threads").insert({ org_id: activeOrgId, contact_id: contact.id, channel: "email", subject: `Conversation with ${contact.first_name}` }).select("id").single();
      if (!error && newThread) router.push(`/inbox?threadId=${newThread.id}`);
    }
  };

  if (!contact) return (
    <AppLayout><div className="h-full flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-berry border-t-transparent rounded-full" /></div></AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <button onClick={() => router.push('/contacts')} className="flex items-center gap-1 text-sm mb-6 text-slate font-body hover:text-ink transition-colors">
          <ChevronLeft size={15} /> Back to Contacts
        </button>

        <div className="flex items-start gap-4 mb-8 flex-wrap justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-[250px]">
            <Avatar name={`${contact.first_name} ${contact.last_name}`} size={64} />
            <div className="flex-1">
              {isEditing ? (
                <div className="flex gap-2 mb-2">
                  <input value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} className="font-display text-[32px] text-ink leading-tight w-full bg-paperDim border border-line rounded px-2 outline-none focus:border-berry" placeholder="First Name" />
                  <input value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} className="font-display text-[32px] text-ink leading-tight w-full bg-paperDim border border-line rounded px-2 outline-none focus:border-berry" placeholder="Last Name" />
                </div>
              ) : (
                <h1 className="font-display text-[32px] text-ink leading-tight">{contact.first_name} {contact.last_name}</h1>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="slate">{contact.stage}</Badge>
                {contact.type === 'patient' && <Badge variant="sage">Patient</Badge>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={() => setIsEditing(false)}><X size={16} /> Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isSavingEdit}>{isSavingEdit ? "Saving..." : <><Save size={16} /> Save</>}</Button>
              </>
            ) : (
              <>
                {(userRole === 'owner' || userRole === 'manager') && (
                  <button onClick={handleDeleteContact} className="p-2 text-slate hover:text-berry transition-colors rounded-lg hover:bg-berrySoft/50" title="Delete Contact">
                    <Trash2 size={18} />
                  </button>
                )}
                <Button variant="outline" icon={Edit3} onClick={() => setIsEditing(true)}>Edit</Button>
                <Button variant="outline" icon={Phone}>Call</Button>
                <Button variant="outline" icon={Mail} onClick={handleEmailClick}>Email</Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl p-5 bg-white border border-line shadow-sm">
              <div className="text-xs uppercase mb-4 text-slate tracking-[0.06em] font-body font-medium">Contact Details</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate font-body">Email</span>
                  {isEditing ? (
                    <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="bg-paperDim border border-line rounded px-2 py-1 outline-none focus:border-berry text-right w-2/3" />
                  ) : (
                    <span className="text-ink font-body font-medium">{contact.email || "—"}</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate font-body">Phone</span>
                  {isEditing ? (
                    <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="bg-paperDim border border-line rounded px-2 py-1 outline-none focus:border-berry text-right font-mono w-2/3" />
                  ) : (
                    <span className="text-ink font-mono font-medium">{contact.phone || "—"}</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate font-body">Total Pipeline Value</span>
                  <span className="text-ink font-mono font-medium text-sage">${contact.total_value.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-5 bg-white border border-line shadow-sm">
              <div className="text-xs uppercase mb-4 text-slate tracking-[0.06em] font-body font-medium">Open Tasks</div>
              {tasks.length === 0 ? (
                <div className="text-sm text-slate font-body">No open tasks.</div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-start gap-2.5">
                      <button onClick={() => toggleTask(t.id)} className="mt-0.5 text-slate hover:text-sage transition-colors"><Circle size={15} /></button>
                      <div>
                        <div className="text-sm text-ink font-body font-medium leading-tight">{t.title}</div>
                        <div className="text-[10px] text-berry font-mono mt-0.5">Due: {new Date(t.due_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col h-full">
            <div className="text-xs uppercase mb-4 text-slate tracking-[0.06em] font-body font-medium">Activity Timeline</div>
            <div className="rounded-xl p-4 bg-white border border-line shadow-sm mb-6 flex flex-col gap-3">
              <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Log a note..." className="w-full text-sm outline-none resize-none font-body text-ink placeholder:text-slate bg-transparent h-16" />
              <div className="flex justify-between items-center border-t border-line pt-3">
                <div className="flex gap-2 text-slate"><button className="hover:text-ink"><Edit3 size={15} /></button></div>
                <Button onClick={handleSaveNote} disabled={isSavingNote || !noteContent.trim()}>{isSavingNote ? "Saving..." : "Save Note"}</Button>
              </div>
            </div>

            <div className="relative pl-6 flex-1">
              <div className="absolute left-[11px] top-2 bottom-0 w-px bg-line" />
              {timeline.map((item, idx) => (
                <div key={idx} className="relative mb-6">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center bg-paperDim border border-line z-10">
                    {item.type === 'note' ? <Edit3 size={10} className="text-slate" /> : <CheckCircle2 size={10} className="text-berry" />}
                  </div>
                  <div className="rounded-xl p-4 bg-white border border-line shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-ink font-body">{item.type === 'note' ? `${item.actor} left a note` : "Stage Change"}</span>
                      <span className="text-[10px] text-slate font-mono">{item.date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-sm text-ink600 font-body whitespace-pre-wrap leading-relaxed">{item.content}</div>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && <div className="text-sm text-slate font-body ml-2">No activity recorded yet.</div>}
            </div>
          </div>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}