import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ availability: await getAvailability() });
  } catch (error) {
    console.error("Availability load failed", error);
    return NextResponse.json({ error: "Availability is temporarily unavailable." }, { status: 503 });
  }
}
