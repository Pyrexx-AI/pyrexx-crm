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

    // 1. Fetch the organization details
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("name, slug, resend_api_key, sending_domain")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: "Failed to resolve organization." }, { status: 400 });
    }

    const activeProvider = new ResendProvider(org.resend_api_key || undefined);
    const emailDomain = org.sending_domain || process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "app.pyrexxai.com";
    const fromAddress = `hello@${emailDomain}`;

    // 2. Check if user already exists
    let targetUserId = null;
    let isNewUser = false;
    let userFullName = cleanEmail.split('@')[0];

    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, full_name")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingUser) {
      targetUserId = existingUser.id;
      userFullName = existingUser.full_name || userFullName;
      
      const { data: existingMember } = await supabaseAdmin
        .from("memberships")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("org_id", org_id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json({ error: "This user is already a member of your team." }, { status: 400 });
      }
    } else {
      // 3. User is brand new. Provision them instantly via Admin API (bypassing native emails)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true // Instantly confirm so they can log in once they set a password
      });

      if (createError || !newUser.user) {
        return NextResponse.json({ error: "Failed to provision new user account." }, { status: 500 });
      }

      targetUserId = newUser.user.id;
      isNewUser = true;
    }

    // 4. Ensure public profile exists
    await supabaseAdmin.from('users').upsert({
      id: targetUserId,
      email: cleanEmail,
      full_name: userFullName
    });

    // 5. Insert into memberships
    const { error: membershipError } = await supabaseAdmin.from('memberships').upsert({
      user_id: targetUserId,
      org_id: org_id,
      role: role,
      status: 'pending' 
    }, { onConflict: 'user_id, org_id' });

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    // 6. Generate our highly secure Custom Token
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from("auth_tokens")
      .insert({ user_id: targetUserId })
      .select("token")
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: "Failed to generate security token." }, { status: 500 });
    }

    // 7. Construct our fully controlled URL
    const origin = req.headers.get("origin") || "https://app.pyrexxai.com";
    const actionLink = `${origin}/auth/update-password?token=${tokenRecord.token}`;

    // 8. Send the customized Resend Email
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

    if (emailResult.error) {
      console.error("[Team Invite API] Email send failed:", emailResult.error);
      return NextResponse.json({ error: `User added to database, but Resend failed to dispatch email: ${emailResult.error}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, isNewUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}