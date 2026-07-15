import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ResendProvider } from "@/lib/email/ResendProvider";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const emailProvider = new ResendProvider();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { org_id, contact_id, sender_id, to, subject, content, htmlContent, attachments, from_slug } = body;

    console.log("[Email API] Received dispatch request:", { org_id, contact_id, to, from_slug });

    if (!org_id || !contact_id || (!content && !htmlContent)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const emailDomain = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "crm.pyrexxai.com";
    const fromAddress = `${from_slug}@${emailDomain}`;

    console.log("[Email API] Attempting send via provider...", { fromAddress, to });

    const emailResult = await emailProvider.sendEmail({
      to,
      from: fromAddress,
      subject: subject || "Update from Pyrexx",
      text: content,
      html: htmlContent,
      attachments: attachments || [],
    });

    if (emailResult.error) {
      console.error("[Email API] Dispatch failed:", emailResult.error);
      return NextResponse.json({ error: emailResult.error }, { status: 500 });
    }

    console.log("[Email API] Send success, updating database threads...");

    let { data: thread } = await supabase
      .from("threads")
      .select("id")
      .eq("org_id", org_id)
      .eq("contact_id", contact_id)
      .eq("channel", "email")
      .single();

    if (!thread) {
      const { data: newThread } = await supabase
        .from("threads")
        .insert({ org_id, contact_id, channel: "email", subject })
        .select("id")
        .single();
      thread = newThread;
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
    console.error("[Email API Critical Crash]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}