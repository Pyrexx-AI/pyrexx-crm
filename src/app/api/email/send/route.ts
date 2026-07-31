import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ResendProvider } from "@/lib/email/ResendProvider";
import { stripHtml } from "@/lib/utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { org_id, contact_id, sender_id, to, subject, content, htmlContent, attachments, from_slug } = body;

    if (!org_id || !contact_id || (!content && !htmlContent)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("slug, resend_api_key, sending_domain")
      .eq("id", org_id)
      .single();

    let senderPrefix = from_slug;
    if (sender_id) {
      const { data: profile } = await supabase.from("users").select("full_name").eq("id", sender_id).maybeSingle();
      if (profile && profile.full_name) {
        senderPrefix = profile.full_name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      }
    }

    const activeProvider = new ResendProvider(org?.resend_api_key || undefined);
    const emailDomain = org?.sending_domain || process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "crm.pyrexxai.com";
    const fromAddress = `${senderPrefix}.${from_slug}@${emailDomain}`;

    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        const { data: fileData, error: fileError } = await supabase.storage.from('attachments').download(att.path);
        if (fileData && !fileError) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          processedAttachments.push({ filename: att.filename, content: buffer });
        }
      }
    }

    const emailResult = await activeProvider.sendEmail({
      to,
      from: fromAddress,
      subject: subject || "Update from Pyrexx",
      text: content,
      html: htmlContent,
      attachments: processedAttachments,
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error }, { status: 500 });
    }

    // FIX: Clean HTML tags before writing to thread preview snippet
    const cleanPreviewSnippet = stripHtml(htmlContent || content).substring(0, 100);

    let { data: thread } = await supabase.from("threads").select("id").eq("org_id", org_id).eq("contact_id", contact_id).eq("channel", "email").maybeSingle();

    if (!thread) {
      const { data: newThread } = await supabase.from("threads").insert({ 
        org_id, 
        contact_id, 
        channel: "email", 
        subject,
        preview: cleanPreviewSnippet 
      }).select("id").single();
      thread = newThread;
    } else {
      await supabase.from("threads").update({ preview: cleanPreviewSnippet }).eq("id", thread.id);
    }

    await supabase.from("messages").insert({
      thread_id: thread!.id,
      sender_id,
      direction: "outbound",
      content: htmlContent || content,
      attachments: attachments || []
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}