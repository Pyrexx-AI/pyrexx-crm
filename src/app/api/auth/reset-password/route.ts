import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ResendProvider } from "@/lib/email/ResendProvider";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_ORIGINS = [
  "https://crm.pyrexxai.com",
  "https://app.pyrexxai.com",
	"https://www.pyrexxai.com",
  "http://localhost:3000"
];

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Missing email address" }, { status: 400 });

    const cleanEmail = email.trim().toLowerCase();
    const rawOrigin = req.headers.get("origin") || "https://crm.pyrexxai.com";
    const origin = ALLOWED_ORIGINS.includes(rawOrigin) ? rawOrigin : "https://crm.pyrexxai.com";
    const redirectUrl = `${origin}/auth/update-password`;

    // Always return generic success to prevent email enumeration attacks
    const genericSuccess = NextResponse.json({ 
      success: true, 
      message: "If an account matches this email, a security reset link has been dispatched." 
    });

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: { redirectTo: redirectUrl }
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.warn("[Reset Password API] Recovery link generation skipped or failed safely.");
      return genericSuccess;
    }

    const actionLink = linkData.properties.action_link;

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, slug, resend_api_key, sending_domain")
      .eq("type", "agency")
      .limit(1)
      .maybeSingle();

    const activeProvider = new ResendProvider(org?.resend_api_key || undefined);
    const emailDomain = org?.sending_domain || process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "crm.pyrexxai.com";
    const fromAddress = `security@${emailDomain}`;

    const resetHtml = `
      <div style="font-family: sans-serif; padding: 24px; max-width: 480px; border: 1px solid #E3E1DA; border-radius: 12px; background-color: #FFFFFF;">
        <h2 style="color: #13141B; font-weight: 600;">Reset Your Password</h2>
        <p style="color: #3A3D49; font-size: 14px; line-height: 1.5;">
          Click the button below to set a new password for your Pyrexx CRM account.
        </p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${actionLink}" style="background-color: #13141B; color: #F5F5F2; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
            Reset Password
          </a>
        </div>
      </div>
    `;

    await activeProvider.sendEmail({
      to: cleanEmail,
      from: fromAddress,
      subject: "Reset your Pyrexx CRM password",
      text: `Please reset your password using this link: ${actionLink}`,
      html: resetHtml
    });

    return genericSuccess;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}