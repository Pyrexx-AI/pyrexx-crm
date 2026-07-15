import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ResendProvider } from "@/lib/email/ResendProvider";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const emailProvider = new ResendProvider();

export async function GET(req: Request) {
  try {
    // 1. Verify Cron Secret to prevent unauthorized execution
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Find all active orgs that have the "Stale Proposal" automation turned ON
    const { data: activeAutomations } = await supabase
      .from("org_automations")
      .select("org_id, organizations(slug)")
      .eq("automation_key", "stale_proposal_followup")
      .eq("is_active", true);

    if (!activeAutomations || activeAutomations.length === 0) {
      return NextResponse.json({ message: "No active automations found." });
    }

    const emailDomain = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "crm.pyrexxai.com";
    let emailsSent = 0;

    // 3. Sweep Deals for each active org
    for (const auto of activeAutomations) {
      const orgId = auto.org_id;
      // @ts-ignore - Supabase join typing
      const orgSlug = auto.organizations?.slug;

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Find deals in "Proposal Sent" that haven't been updated in 3 days AND haven't been auto-followed up yet
      const { data: staleDeals } = await supabase
        .from("deals")
        .select("id, name, contact_id, contacts(first_name, email)")
        .eq("org_id", orgId)
        .eq("stage", "Proposal Sent")
        .lt("updated_at", threeDaysAgo.toISOString())
        .is("last_auto_followup", null);

      if (staleDeals && staleDeals.length > 0) {
        for (const deal of staleDeals) {
          const contact = deal.contacts as any;
          if (!contact || !contact.email) continue;

          // Dispatch Auto-Follow-Up Email
          const fromAddress = `${orgSlug}@${emailDomain}`;
          const content = `Hi ${contact.first_name},\n\nI wanted to float this to the top of your inbox. Did you have any questions regarding the proposal we sent over for ${deal.name}?\n\nBest,\nPyrexx Team`;

          const emailResult = await emailProvider.sendEmail({
            to: contact.email,
            from: fromAddress,
            subject: "Checking in on our proposal",
            text: content,
          });

          if (!emailResult.error) {
            emailsSent++;

            // Ensure Thread exists
            let threadId;
            const { data: existingThread } = await supabase.from("threads").select("id").eq("org_id", orgId).eq("contact_id", deal.contact_id).single();
            if (existingThread) {
              threadId = existingThread.id;
            } else {
              const { data: newThread } = await supabase.from("threads").insert({ org_id: orgId, contact_id: deal.contact_id, channel: "email", subject: "Proposal Follow Up" }).select("id").single();
              threadId = newThread!.id;
            }

            // Log Message
            await supabase.from("messages").insert({ thread_id: threadId, direction: "outbound", content });

            // Log Activity Timeline
            await supabase.from("activities").insert({ org_id: orgId, contact_id: deal.contact_id, type: "note", content: "System triggered automated proposal follow-up email." });

            // Mark deal so it doesn't get spammed tomorrow
            await supabase.from("deals").update({ last_auto_followup: new Date().toISOString() }).eq("id", deal.id);
          }
        }
      }
    }

    return NextResponse.json({ success: true, emailsSent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}