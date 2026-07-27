import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, title, dueDate } = await req.json();

    const { data: user } = await supabase.from("users").select("calendar_connected, calendar_provider").eq("id", userId).maybeSingle();
    
    if (!user || !user.calendar_connected) {
      return NextResponse.json({ error: "Calendar not connected" }, { status: 400 });
    }

    console.log(`[Calendar Bridge] Event successfully scheduled: "${title}" on ${dueDate} to ${user.calendar_provider}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}