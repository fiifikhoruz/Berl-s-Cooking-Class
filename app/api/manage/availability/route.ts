import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { hasAdminSession, isVercelRuntime } from "@/lib/admin-session";
import { upsertAvailabilityOverride } from "@/lib/data-store";

const overrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.enum(["*", "10:00", "13:00", "16:00", "18:00"]),
  available: z.boolean(),
});

export async function POST(request: Request) {
  const vercel = isVercelRuntime();
  const user = vercel ? null : await getChatGPTUser();
  const adminEmail = (process.env.ADMIN_EMAIL ?? env.ADMIN_EMAIL)?.trim().toLowerCase();
  const authorized = vercel ? await hasAdminSession() : Boolean(user && adminEmail && user.email.toLowerCase() === adminEmail);
  if (!authorized) {
    return NextResponse.json({ error: "You do not have permission to manage availability." }, { status: 403 });
  }
  const parsed = overrideSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid date and time." }, { status: 400 });
  const data = parsed.data;
  await upsertAvailabilityOverride({
    key: `${data.date}:${data.time}`,
    sessionDate: data.date,
    sessionTime: data.time,
    available: data.available,
    updatedAt: new Date(),
  });
  return NextResponse.json({ message: `${data.time === "*" ? "Day" : "Time"} ${data.available ? "opened" : "closed"} successfully.` });
}
