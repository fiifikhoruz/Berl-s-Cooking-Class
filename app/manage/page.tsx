import Link from "next/link";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { hasAdminSession, isVercelRuntime } from "@/lib/admin-session";
import { listUpcomingBookings } from "@/lib/data-store";
import { redirect } from "next/navigation";
import { ManageAvailability } from "./manage-availability";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const vercel = isVercelRuntime();
  const user = vercel ? null : await requireChatGPTUser("/manage");
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (vercel && !await hasAdminSession()) redirect("/manage/login");

  if (!adminEmail) {
    return <ManageNotice title="One detail still needed" copy="Add the host’s email address to activate availability controls and booking management." />;
  }
  if (user && user.email.toLowerCase() !== adminEmail) {
    return <ManageNotice title="This page is private" copy="You are signed in, but this email does not have permission to manage sessions." />;
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows = await listUpcomingBookings(today);
  const bookingRows = rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));

  return <ManageAvailability bookings={bookingRows} />;
}

function ManageNotice({ title, copy }: { title: string; copy: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-5">
      <div className="max-w-lg border border-black bg-white p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em]">Session manager</p>
        <h1 className="mt-3 font-serif text-4xl font-normal">{title}</h1>
        <p className="mt-4 leading-7 text-neutral-600">{copy}</p>
        <Link href="/" className="mt-6 inline-block font-semibold underline underline-offset-4">Back to the website</Link>
      </div>
    </main>
  );
}
