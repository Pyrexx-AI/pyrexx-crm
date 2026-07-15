import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, title, dueDate } = await req.json();

    // 1. Verify User has calendar connected
    const { data: user } = await supabase.from("users").select("calendar_connected, calendar_provider").eq("id", userId).single();
    
    if (!user || !user.calendar_connected) {
      return NextResponse.json({ error: "Calendar not connected" }, { status: 400 });
    }

    // 2. Simulate API Call to External Provider (Nylas / Google API)
    // In production: const nylasRes = await fetch('https://api.nylas.com/events', { ... })
    console.log(`[Calendar Bridge] Pushed event: "${title}" on ${dueDate} to ${user.calendar_provider}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}