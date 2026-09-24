import { NextResponse } from "next/server";
import { adminConfigReady, createAdminSession, secureEqual } from "@/lib/admin-session";

export async function POST(request: Request) {
  if (!adminConfigReady()) return NextResponse.redirect(new URL("/manage/login?error=config", request.url), 303);
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const validEmail = await secureEqual(email, process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "");
  const validPassword = await secureEqual(password, process.env.ADMIN_PASSWORD ?? "");
  if (!validEmail || !validPassword) return NextResponse.redirect(new URL("/manage/login?error=credentials", request.url), 303);
  await createAdminSession();
  return NextResponse.redirect(new URL("/manage", request.url), 303);
}
