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

    // 1. Send the Invite via Supabase Admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const userId = inviteData.user.id;

    // 2. Ensure they exist in public.users (Just in case the trigger lagged)
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