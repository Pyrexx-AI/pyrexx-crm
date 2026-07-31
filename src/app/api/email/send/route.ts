import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ResendProvider } from "@/lib/email/ResendProvider";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { org_id, contact_id, sender_id, to, subject, content, htmlContent, attachments, from_slug } = body;

    console.log("[Email API] Received dispatch request:", { org_id, contact_id, to, from_slug, sender_id });

    if (!org_id || !contact_id || (!content && !htmlContent)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("slug, resend_api_key, sending_domain")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      console.error("[Email API] Failed to resolve organization configurations:", orgError);
      return NextResponse.json({ error: "Failed to resolve workspace configurations." }, { status: 400 });
    }

    let senderPrefix = from_slug; 
    
    if (sender_id) {
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("full_name")
        .eq("id", sender_id)
        .maybeSingle();

      if (profile && profile.full_name) {
        const firstName = profile.full_name.trim().split(/\s+/)[0];
        senderPrefix = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
      }
    }

    const activeProvider = new ResendProvider(org.resend_api_key || undefined);
    const emailDomain = org.sending_domain || process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "crm.pyrexxai.com";
    const fromAddress = `${senderPrefix}.${from_slug}@${emailDomain}`;

    // FIX: Added explicit TypeScript definition to the processed array
    const processedAttachments: { filename: string; content: Buffer }[] = [];
    
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        const { data: fileData, error: fileError } = await supabaseAdmin.storage.from('attachments').download(att.path);
        if (fileData && !fileError) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          processedAttachments.push({ filename: att.filename, content: buffer });
        }
      }
    }

    console.log("[Email API] Attempting send via dynamic provider...", { 
      fromAddress, 
      to, 
      usingCustomKey: !!org.resend_api_key 
    });

    const emailResult = await activeProvider.sendEmail({
      to,
      from: fromAddress,
      subject: subject || "Update from Pyrexx",
      text: content,
      html: htmlContent,
      attachments: processedAttachments,
    });

    if (emailResult.error) {
      console.error("[Email API] Dynamic dispatch failed:", emailResult.error);
      return NextResponse.json({ error: emailResult.error }, { status: 500 });
    }

    console.log("[Email API] Send success, updating database threads...");

    let { data: thread } = await supabaseAdmin
      .from("threads")
      .select("id")
      .eq("org_id", org_id)
      .eq("contact_id", contact_id)
      .eq("channel", "email")
      .single();

    if (!thread) {
      const { data: newThread } = await supabaseAdmin
        .from("threads")
        .insert({ org_id, contact_id, channel: "email", subject })
        .select("id")
        .single();
      thread = newThread;
    }

    await supabaseAdmin.from("messages").insert({
      thread_id: thread!.id,
      sender_id,
      direction: "outbound",
      content: htmlContent || content,
      attachments: attachments || []
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Email API Critical Crash]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}