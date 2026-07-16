import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ResendProvider } from "@/lib/email/ResendProvider";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, role, org_id } = await req.json();

    if (!email || !role || !org_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const origin = req.headers.get("origin") || "https://crm.pyrexxai.com";
    const redirectUrl = `${origin}/auth/update-password`;

    // 1. Fetch the organization details
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("name, slug, resend_api_key, sending_domain")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: "Failed to resolve organization." }, { status: 400 });
    }

    // Initialize the Resend provider dynamically (multi-tenant key support)
    const activeProvider = new ResendProvider(org.resend_api_key || undefined);
    const emailDomain = org.sending_domain || process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "crm.pyrexxai.com";
    const fromAddress = `hello@${emailDomain}`;

    // 2. Check if the user already exists by querying our synchronized public.users table [20]
    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (lookupError) {
      console.error("[Team Invite API] Error looking up user profile:", lookupError);
    }

    if (existingUser) {
      const existingUserId = existingUser.id;

      // Check if they already have an active membership in this specific organization
      const { data: existingMember } = await supabaseAdmin
        .from("memberships")
        .select("id")
        .eq("user_id", existingUserId)
        .eq("org_id", org_id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json({ error: "This user is already a member of your team." }, { status: 400 });
      }

      // Generate a secure recovery/password-reset link for the existing user [21]
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery', 
        email: cleanEmail,
        options: { redirectTo: redirectUrl } 
      });

      if (linkError) {
        console.error("[Team Invite API] Failed to generate recovery link:", linkError);
        return NextResponse.json({ error: "Failed to generate workspace link: " + linkError.message }, { status: 500 });
      }

      const actionLink = linkData?.properties?.action_link;

      if (!actionLink) {
        return NextResponse.json({ error: "Failed to resolve secure action link." }, { status: 500 });
      }

      // Ensure their public profile row is registered in our CRM's users table
      await supabaseAdmin.from('users').upsert({
        id: existingUserId,
        email: cleanEmail,
        full_name: existingUser.full_name || cleanEmail.split('@')[0]
      });

      // Insert them into memberships with status 'pending' because they need to configure their password
      const { error: membershipError } = await supabaseAdmin.from('memberships').insert({
        user_id: existingUserId,
        org_id: org_id,
        role: role,
        status: 'pending' 
      });

      if (membershipError) {
        return NextResponse.json({ error: membershipError.message }, { status: 500 });
      }

      // Send the custom Welcome email with the secure recovery link [21]
      const welcomeHtml = `
        <div style="font-family: sans-serif; padding: 24px; max-width: 480px; border: 1px solid #E3E1DA; border-radius: 12px; background-color: #FFFFFF;">
          <h2 style="color: #13141B; font-weight: 600;">Welcome to ${org.name}</h2>
          <p style="color: #3A3D49; font-size: 14px; line-height: 1.5;">
            You have been added to the <strong>${org.name}</strong> workspace on the Pyrexx AI CRM.
          </p>
          <p style="color: #3A3D49; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            To secure your access to this CRM workspace, please set a password for your account using the button below.
          </p>
          <div style="text-align: center;">
            <a href="${actionLink}" style="background-color: #13141B; color: #F5F5F2; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
              Configure Password & Access
            </a>
          </div>
        </div>
      `;

      const emailResult = await activeProvider.sendEmail({
        to: cleanEmail,
        from: fromAddress,
        subject: `You've been added to ${org.name} on Pyrexx AI`,
        text: `You have been added to ${org.name}. Set your password and access your workspace at ${actionLink}`,
        html: welcomeHtml
      });

      // UPGRADE: Explicitly throw error if Resend fails, preventing silent success toasts
      if (emailResult.error) {
        console.error("[Team Invite API] Email send failed:", emailResult.error);
        return NextResponse.json({ error: `User added to database, but Resend failed to dispatch email: ${emailResult.error}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, isNewUser: false });
    }

    // 4. PATH B: User is brand new. Trigger the standard invitation token flow.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo: redirectUrl
    });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const newUserId = inviteData?.user?.id;
    if (!newUserId) {
      return NextResponse.json({ error: "Failed to generate user ID." }, { status: 500 });
    }

    await supabaseAdmin.from('users').upsert({ id: newUserId, email: cleanEmail, full_name: cleanEmail.split('@')[0] });

    const { error: membershipError } = await supabaseAdmin.from('memberships').insert({
      user_id: newUserId,
      org_id: org_id,
      role: role,
      status: 'pending' 
    });

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, isNewUser: true, user: inviteData.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}