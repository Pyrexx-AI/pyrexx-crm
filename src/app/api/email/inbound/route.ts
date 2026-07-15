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

    const emailData = payload.data || payload; 
    const { from, to, subject, text, html } = emailData;

    console.log("[Inbound Webhook] Received email packet:", { from, to, subject });

    if (!from || !to) {
      return NextResponse.json({ error: "Missing to/from addresses" }, { status: 400 });
    }

    const toAddress = Array.isArray(to) ? to[0] : to;
    const localPart = toAddress.split("@")[0].toLowerCase();

    // 1. Resolve Organization Slug
    // If the address is peter.pyrexxai@..., the local-part is "peter.pyrexxai".
    // We split by the dot to extract the actual organization slug: "pyrexxai".
    let slug = localPart;
    if (localPart.includes(".")) {
      slug = localPart.split(".")[1]; // "peter.pyrexxai" -> "pyrexxai"
    }

    console.log("[Inbound Webhook] Resolving organization via slug:", { localPart, resolvedSlug: slug });

    const { data: org } = await supabase.from("organizations").select("id").eq("slug", slug).single();
    if (!org) {
      console.error("[Inbound Webhook] Organization slug lookup failed:", { slug });
      return NextResponse.json({ error: "Sub-account not found" }, { status: 404 });
    }

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
      console.log("[Inbound Webhook] Contact not found, auto-creating lead...", { senderEmail });
      const { data: newContact } = await supabase.from("contacts").insert({
        org_id: org.id,
        first_name: senderEmail.split("@")[0], 
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
      console.log("[Inbound Webhook] Active conversation thread not found, provisioning...");
      const { data: newThread } = await supabase.from("threads").insert({
        org_id: org.id,
        contact_id: contactId,
        channel: "email",
        subject: subject || "Inbound Conversation"
      }).select("id").single();
      threadId = newThread!.id;
    }

    // 4. Insert the Message (Our Postgres trigger will auto-update the thread timestamp and unread status)
    const { error: insertError } = await supabase.from("messages").insert({
      thread_id: threadId,
      direction: "inbound",
      content: text || html || "Empty Message content"
    });

    if (insertError) {
      console.error("[Inbound Webhook] Failed to write message to database:", insertError);
      return NextResponse.json({ error: "Failed to log message." }, { status: 500 });
    }

    console.log("[Inbound Webhook] Message logged successfully. Realtime listeners updated.");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Inbound Webhook Critical Exception]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}