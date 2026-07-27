import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ResendProvider } from "@/lib/email/ResendProvider";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_ORIGINS = [
  "https://crm.pyrexxai.com",
  "https://app.pyrexxai.com",
  "http://localhost:3000"
];

export async function POST(req: Request) {
  try {
    // 1. SECURITY: Verify caller's authenticated session
    const cookieStore = cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );

    const { data: { user: caller } } = await supabaseServer.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { email, role, org_id } = await req.json();

    if (!email || !role || !org_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. SECURITY: Verify caller is an Owner/Manager in this specific organization
    const { data: callerMembership } = await supabaseAdmin
      .from("memberships")
      .select("role")
      .eq("user_id", caller.id)
      .eq("org_id", org_id)
      .maybeSingle();

    const isAuthorized = ['owner', 'manager', 'admin'].includes(callerMembership?.role?.toLowerCase() || '');
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden. Insufficient permissions to invite team members." }, { status: 403 });
    }

    // 3. SECURITY: Validate origin against explicit whitelist
    const rawOrigin = req.headers.get("origin") || "https://crm.pyrexxai.com";
    const origin = ALLOWED_ORIGINS.includes(rawOrigin) ? rawOrigin : "https://crm.pyrexxai.com";
    const redirectUrl = `${origin}/auth/update-password?org_id=${org_id}`;

    const cleanEmail = email.trim().toLowerCase();

    // 4. Resolve Organization details for email config
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, slug, resend_api_key, sending_domain")
      .eq("id", org_id)
      .single();

    const activeProvider = new ResendProvider(org?.resend_api_key || undefined);
    const emailDomain = org?.sending_domain || process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "crm.pyrexxai.com";
    const fromAddress = `hello@${emailDomain}`;

    // 5. Dual-Path Check: See if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingUser) {
      const existingUserId = existingUser.id;

      const { data: existingMember } = await supabaseAdmin
        .from("memberships")
        .select("id")
        .eq("user_id", existingUserId)
        .eq("org_id", org_id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json({ error: "This user is already a member of your team." }, { status: 400 });
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery', 
        email: cleanEmail,
        options: { redirectTo: redirectUrl } 
      });

      if (linkError) {
        return NextResponse.json({ error: "Failed to generate security link: " + linkError.message }, { status: 500 });
      }

      const actionLink = linkData?.properties?.action_link;

      await supabaseAdmin.from('memberships').insert({
        user_id: existingUserId,
        org_id: org_id,
        role: role,
        status: 'pending' 
      });

      const welcomeHtml = `
        <div style="font-family: sans-serif; padding: 24px; max-width: 480px; border: 1px solid #E3E1DA; border-radius: 12px; background-color: #FFFFFF;">
          <h2 style="color: #13141B; font-weight: 600;">Welcome to ${org?.name}</h2>
          <p style="color: #3A3D49; font-size: 14px; line-height: 1.5;">
            You have been invited to join the <strong>${org?.name}</strong> workspace on Pyrexx AI CRM.
          </p>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${actionLink}" style="background-color: #13141B; color: #F5F5F2; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
              Configure Password & Access
            </a>
          </div>
        </div>
      `;

      const emailResult = await activeProvider.sendEmail({
        to: cleanEmail,
        from: fromAddress,
        subject: `Invitation to join ${org?.name} on Pyrexx AI`,
        text: `You have been invited to ${org?.name}. Access your workspace at ${actionLink}`,
        html: welcomeHtml
      });

      if (emailResult.error) {
        return NextResponse.json({ error: `Member added, but Resend failed to dispatch email: ${emailResult.error}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, isNewUser: false });
    }

    // PATH B: Brand-new user token flow
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo: redirectUrl
    });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const newUserId = inviteData?.user?.id;
    if (!newUserId) return NextResponse.json({ error: "Failed to generate user ID." }, { status: 500 });

    await supabaseAdmin.from('users').upsert({ id: newUserId, email: cleanEmail, full_name: cleanEmail.split('@')[0] });
    await supabaseAdmin.from('memberships').insert({ user_id: newUserId, org_id: org_id, role: role, status: 'pending' });

    return NextResponse.json({ success: true, isNewUser: true, user: inviteData.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}