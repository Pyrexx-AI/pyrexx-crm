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
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

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

    for (const auto of activeAutomations) {
      const orgId = auto.org_id;
      // @ts-ignore
      const orgSlug = auto.organizations?.slug;

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: staleDeals } = await supabase
        .from("deals")
        .select("id, name, contact_id, contacts(first_name, email)")
        .eq("org_id", orgId)
        .eq("stage", "Proposal Sent")
        .lt("updated_at", threeDaysAgo.toISOString())
        .is("last_auto_followup", null);

      if (staleDeals && staleDeals.length > 0) {
        // Run emails concurrently to prevent Vercel timeout limits
        const emailPromises = staleDeals.map(async (deal) => {
          const contact = deal.contacts as any;
          if (!contact || !contact.email) return;

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

            let threadId;
            const { data: existingThread } = await supabase.from("threads").select("id").eq("org_id", orgId).eq("contact_id", deal.contact_id).single();
            if (existingThread) {
              threadId = existingThread.id;
            } else {
              const { data: newThread } = await supabase.from("threads").insert({ org_id: orgId, contact_id: deal.contact_id, channel: "email", subject: "Proposal Follow Up" }).select("id").single();
              threadId = newThread!.id;
            }

            await Promise.all([
              supabase.from("messages").insert({ thread_id: threadId, direction: "outbound", content }),
              supabase.from("activities").insert({ org_id: orgId, contact_id: deal.contact_id, type: "note", content: "System triggered automated proposal follow-up email." }),
              supabase.from("deals").update({ last_auto_followup: new Date().toISOString() }).eq("id", deal.id)
            ]);
          }
        });

        await Promise.allSettled(emailPromises);
      }
    }

    return NextResponse.json({ success: true, emailsSent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}