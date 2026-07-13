import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ResendProvider } from "@/lib/email/ResendProvider";

// Using Service Role to bypass RLS securely on the server
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const emailProvider = new ResendProvider();

export async function POST(req: Request) {
  try {
    const { org_id, contact_id, sender_id, to, subject, content, from_slug } = await req.json();

    if (!org_id || !contact_id || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fromAddress = `${from_slug}@crm.pyrexxai.com`;

    // 1. Dispatch Email via Provider Adapter
    const emailResult = await emailProvider.sendEmail({
      to,
      from: fromAddress,
      subject: subject || "Update from Pyrexx",
      text: content,
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error }, { status: 500 });
    }

    // 2. Find or Create Thread
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

    // 3. Save Message to DB (Trigger will update the thread automatically)
    await supabase.from("messages").insert({
      thread_id: thread!.id,
      sender_id,
      direction: "outbound",
      content,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}