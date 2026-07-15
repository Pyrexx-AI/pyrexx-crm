import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // UPGRADE: Dynamically extract the origin header from the request
    // This supports seamless local development (localhost) and production (crm.pyrexxai.com) redirections
    const origin = req.headers.get("origin") || "https://crm.pyrexxai.com";
    const redirectUrl = `${origin}/auth/update-password`;

    console.log("[Team Invite API] Initiating invite with explicit redirect:", { 
      email, 
      redirectUrl 
    });

    // Pass the explicit redirect destination to the Supabase Auth invitation SDK
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectUrl // <-- Tells Supabase exactly which whitelisted URL to redirect to
    });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const userId = inviteData?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Failed to resolve user ID from invite response." }, { status: 500 });
    }

    // 2. Ensure they exist in public.users
    await supabaseAdmin.from('users').upsert({ id: userId, email: email, full_name: email.split('@')[0] });

    // 3. Assign them to the organization in memberships
    const { error: membershipError } = await supabaseAdmin.from('memberships').insert({
      user_id: userId,
      org_id: org_id,
      role: role
    });

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: inviteData.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}