import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Validate the custom token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("auth_tokens")
      .select("user_id, expires_at, users(email)")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Invalid or expired security token." }, { status: 400 });
    }

    // 2. Check Expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      await supabaseAdmin.from("auth_tokens").delete().eq("token", token);
      return NextResponse.json({ error: "This security link has expired." }, { status: 400 });
    }

    // 3. Forcefully update the password using the Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(tokenData.user_id, { 
      password: password 
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Activate all pending workspaces for this user
    await supabaseAdmin
      .from("memberships")
      .update({ status: 'active' })
      .eq("user_id", tokenData.user_id)
      .eq("status", "pending");

    // 5. Delete the single-use token
    await supabaseAdmin.from("auth_tokens").delete().eq("token", token);

    // @ts-ignore
    const userEmail = tokenData.users?.email;

    return NextResponse.json({ success: true, email: userEmail });
  } catch (err: any) {
    console.error("[Confirm Password API Exception]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}