import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Uses Service Role to safely write to DB from an external webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Resend's inbound webhook shape: { type: 'email.received', data: { to: '...', from: '...', subject: '...', text: '...' } }
    // Note: Some parsers send raw JSON directly. We handle both.
    const emailData = payload.data || payload; 
    const { from, to, subject, text, html } = emailData;

    if (!from || !to) {
      return NextResponse.json({ error: "Missing to/from addresses" }, { status: 400 });
    }

    // 1. Extract the organization slug from the "to" address (e.g. bloomspa@app.pyrexxai.com -> bloomspa)
    const toAddress = Array.isArray(to) ? to[0] : to;
    const slug = toAddress.split("@")[0].toLowerCase();

    const { data: org } = await supabase.from("organizations").select("id").eq("slug", slug).single();
    if (!org) return NextResponse.json({ error: "Sub-account not found" }, { status: 404 });

    // 2. Extract sender email and find Contact (Create if it's a new inbound inquiry)
    const senderEmailMatch = from.match(/<(.+)>/);
    const senderEmail = senderEmailMatch ? senderEmailMatch[1].toLowerCase() : from.toLowerCase();
    
    let contactId = null;
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("org_id", org.id)
      .eq("email", senderEmail)
      .single();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Auto-create lead for inbound email
      const { data: newContact } = await supabase.from("contacts").insert({
        org_id: org.id,
        first_name: senderEmail.split("@")[0], // Fallback name
        last_name: "Inquiry",
        email: senderEmail,
        type: "lead",
        stage: "New Lead"
      }).select("id").single();
      contactId = newContact!.id;
    }

    // 3. Find or create Thread
    let threadId = null;
    const { data: existingThread } = await supabase
      .from("threads")
      .select("id")
      .eq("org_id", org.id)
      .eq("contact_id", contactId)
      .eq("channel", "email")
      .single();

    if (existingThread) {
      threadId = existingThread.id;
    } else {
      const { data: newThread } = await supabase.from("threads").insert({
        org_id: org.id,
        contact_id: contactId,
        channel: "email",
        subject: subject || "Inbound Conversation"
      }).select("id").single();
      threadId = newThread!.id;
    }

    // 4. Insert the Message (Our Postgres trigger will auto-update the thread timestamp and unread status)
    await supabase.from("messages").insert({
      thread_id: threadId,
      direction: "inbound",
      content: text || html || "Empty Message content"
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Inbound Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}