import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ResendProvider } from "@/lib/email/ResendProvider";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Missing email address" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const origin = req.headers.get("origin") || "https://crm.pyrexxai.com";
    const redirectUrl = `${origin}/auth/update-password`;

    console.log("[Reset Password API] Generating recovery link for:", { cleanEmail, redirectUrl });

    // 1. Generate the secure recovery link via Admin API [21]
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: { redirectTo: redirectUrl }
    });

    if (linkError) {
      console.error("[Reset Password API] Failed to generate recovery link:", linkError);
      return NextResponse.json({ error: "Failed to generate security link: " + linkError.message }, { status: 500 });
    }

    const actionLink = linkData?.properties?.action_link;

    if (!actionLink) {
      return NextResponse.json({ error: "Failed to resolve secure action link." }, { status: 500 });
    }

    // 2. Fetch the root Pyrexx AI organization details to configure SMTP/Resend
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, slug, resend_api_key, sending_domain")
      .eq("slug", "pyrexxai")
      .single();

    const activeProvider = new ResendProvider(org?.resend_api_key || undefined);
    const emailDomain = org?.sending_domain || process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "crm.pyrexxai.com";
    const fromAddress = `security@${emailDomain}`;

    const resetHtml = `
      <div style="font-family: sans-serif; padding: 24px; max-width: 480px; border: 1px solid #E3E1DA; border-radius: 12px; background-color: #FFFFFF; box-shadow: 0px 4px 12px rgba(19, 20, 27, 0.03);">
        <h2 style="color: #13141B; font-weight: 600; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #3A3D49; font-size: 14px; line-height: 1.5;">
          We received a request to reset the password for your Pyrexx CRM account.
        </p>
        <p style="color: #3A3D49; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
          Click the secure button below to establish a new password. This link is single-use and will expire shortly.
        </p>
        <div style="text-align: center;">
          <a href="${actionLink}" style="background-color: #13141B; color: #F5F5F2; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #6B6E77; font-size: 11px; margin-top: 28px; line-height: 1.4; border-top: 1px solid #E3E1DA; padding-top: 16px; font-style: italic;">
          If you did not request this change, you can safely ignore this email. Your credentials will remain secure.
        </p>
      </div>
    `;

    console.log("[Reset Password API] Sending custom email via Resend...", { fromAddress, to: cleanEmail });

    const emailResult = await activeProvider.sendEmail({
      to: cleanEmail,
      from: fromAddress,
      subject: "Reset your Pyrexx CRM password",
      text: `Please reset your password using this link: ${actionLink}`,
      html: resetHtml
    });

    if (emailResult.error) {
      console.error("[Reset Password API] Email send failed:", emailResult.error);
      return NextResponse.json({ error: `Security link generated, but Resend failed to dispatch email: ${emailResult.error}` }, { status: 500 });
    }

    console.log("[Reset Password API] Security email dispatched successfully.");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Reset Password API Exception]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}