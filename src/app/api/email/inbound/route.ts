import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const emailData = payload.data || payload; 
    const { from, to, subject, text, html, attachments } = emailData;

    if (!from || !to) return NextResponse.json({ error: "Missing to/from addresses" }, { status: 400 });

    const toAddress = Array.isArray(to) ? to[0] : to;
    const localPart = toAddress.split("@")[0].toLowerCase();

    // FIX: Safely parse multi-dot rep usernames (e.g. peter.gambo.pyrexxai -> "pyrexxai")
    let slug = localPart;
    if (localPart.includes(".")) {
      const parts = localPart.split(".");
      slug = parts.pop() || localPart;
    }

    const { data: org } = await supabaseAdmin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (!org) return NextResponse.json({ error: "Sub-account not found" }, { status: 404 });

    const senderEmailMatch = from.match(/<(.+)>/);
    const senderEmail = senderEmailMatch ? senderEmailMatch[1].toLowerCase() : from.toLowerCase();
    
    let contactId = null;
    const { data: existingContact } = await supabaseAdmin.from("contacts").select("id").eq("org_id", org.id).eq("email", senderEmail).maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact } = await supabaseAdmin.from("contacts").insert({
        org_id: org.id,
        first_name: senderEmail.split("@")[0], 
        last_name: "Inquiry",
        email: senderEmail,
        type: "lead",
        stage: "New Lead"
      }).select("id").single();
      contactId = newContact!.id;
    }

    let threadId = null;
    const { data: existingThread } = await supabaseAdmin.from("threads").select("id").eq("org_id", org.id).eq("contact_id", contactId).eq("channel", "email").maybeSingle();

    if (existingThread) {
      threadId = existingThread.id;
    } else {
      const { data: newThread } = await supabaseAdmin.from("threads").insert({
        org_id: org.id,
        contact_id: contactId,
        channel: "email",
        subject: subject || "Inbound Conversation"
      }).select("id").single();
      threadId = newThread!.id;
    }

    // FIX: Process and store inbound attachments
    const processedAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.content) {
          const buffer = Buffer.from(att.content, 'base64');
          const filePath = `${org.id}/${Date.now()}-${att.filename}`;
          const { error: uploadError } = await supabaseAdmin.storage.from('attachments').upload(filePath, buffer, { contentType: att.type });
          if (!uploadError) {
            processedAttachments.push({ filename: att.filename, path: filePath });
          }
        }
      }
    }

    await supabaseAdmin.from("messages").insert({
      thread_id: threadId,
      direction: "inbound",
      content: text || html || "Empty Message content",
      attachments: processedAttachments
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}