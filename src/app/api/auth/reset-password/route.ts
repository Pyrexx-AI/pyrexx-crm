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

    // 1. Look up the user in our public users table
    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (!userProfile) {
      // Return success anyway to prevent email enumeration attacks
      return NextResponse.json({ success: true });
    }

    // 2. Generate a highly secure custom token
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from("auth_tokens")
      .insert({ user_id: userProfile.id })
      .select("token")
      .single();

    if (tokenError || !tokenRecord) {
      console.error("[Reset Password API] Failed to generate custom token:", tokenError);
      return NextResponse.json({ error: "Failed to generate security token." }, { status: 500 });
    }

    // 3. Construct our 100% custom, controlled URL
    const origin = req.headers.get("origin") || "https://app.pyrexxai.com";
    const actionLink = `${origin}/auth/update-password?token=${tokenRecord.token}`;

    console.log("[Reset Password API] Custom link generated:", { cleanEmail, actionLink });

    // 4. Fetch the root Pyrexx AI organization details for email config
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, slug, resend_api_key, sending_domain")
      .eq("slug", "pyrexxai")
      .single();

    const activeProvider = new ResendProvider(org?.resend_api_key || undefined);
    const emailDomain = org?.sending_domain || process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "app.pyrexxai.com";
    const fromAddress = `security@${emailDomain}`;

    const resetHtml = `
      <div style="font-family: sans-serif; padding: 24px; max-width: 480px; border: 1px solid #E3E1DA; border-radius: 12px; background-color: #FFFFFF; box-shadow: 0px 4px 12px rgba(19, 20, 27, 0.03);">
        <h2 style="color: #13141B; font-weight: 600; font-size: 20px; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #3A3D49; font-size: 14px; line-height: 1.5;">
          We received a request to reset the password for your Pyrexx CRM account.
        </p>
        <p style="color: #3A3D49; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
          Click the secure button below to establish a new password. This link is single-use and will expire in 24 hours.
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

    const emailResult = await activeProvider.sendEmail({
      to: cleanEmail,
      from: fromAddress,
      subject: "Reset your Pyrexx CRM password",
      text: `Please reset your password using this link: ${actionLink}`,
      html: resetHtml
    });

    if (emailResult.error) {
      console.error("[Reset Password API] Email send failed:", emailResult.error);
      return NextResponse.json({ error: `Security link generated, but Resend failed to dispatch email.` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Reset Password API Exception]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}