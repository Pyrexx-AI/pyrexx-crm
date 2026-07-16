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

    // 1. Validate the custom token (Removed the broken users() join)
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("auth_tokens")
      .select("user_id, expires_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("[Confirm Password API] Token lookup failed:", tokenError);
      return NextResponse.json({ error: "Invalid or expired security token." }, { status: 400 });
    }

    // 2. Check Expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      await supabaseAdmin.from("auth_tokens").delete().eq("token", token);
      return NextResponse.json({ error: "This security link has expired." }, { status: 400 });
    }

    // 3. Fetch the user's email directly from the Auth system (most reliable source of truth)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(tokenData.user_id);
    
    if (authError || !authUser?.user) {
      console.error("[Confirm Password API] Failed to resolve user account:", authError);
      return NextResponse.json({ error: "Failed to resolve user account." }, { status: 500 });
    }

    const userEmail = authUser.user.email;

    // 4. Forcefully update the password using the Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(tokenData.user_id, { 
      password: password 
    });

    if (updateError) {
      console.error("[Confirm Password API] Failed to update password:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 5. Activate all pending workspaces for this user
    await supabaseAdmin
      .from("memberships")
      .update({ status: 'active' })
      .eq("user_id", tokenData.user_id)
      .eq("status", "pending");

    // 6. Delete the single-use token to prevent reuse
    await supabaseAdmin.from("auth_tokens").delete().eq("token", token);

    return NextResponse.json({ success: true, email: userEmail });
  } catch (err: any) {
    console.error("[Confirm Password API Exception]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}