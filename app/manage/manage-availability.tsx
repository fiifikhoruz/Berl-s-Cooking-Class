"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Booking = {
  id: string;
  dishName: string;
  sessionDate: string;
  sessionTime: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

export function ManageAvailability({ bookings }: { bookings: Booking[] }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("");
    const available = form.get("available") === "true";
    const response = await fetch("/api/manage/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: form.get("date"), time: form.get("time"), available }),
    });
    const payload = await response.json() as { message?: string; error?: string };
    setMessage(response.ok ? payload.message ?? "Availability updated." : payload.error ?? "The update could not be saved.");
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-white px-5 py-8 text-black sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold underline underline-offset-4">← View booking website</Link>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.16em]">Session manager</p><h1 className="mt-2 font-serif text-4xl font-normal sm:text-5xl">Availability and bookings</h1></div>
          <div className="flex items-center gap-4"><p className="text-sm text-neutral-600">Regular hours: Monday to Wednesday</p><form action="/api/admin/logout" method="post"><button className="min-h-11 text-sm font-semibold underline underline-offset-4" type="submit">Sign out</button></form></div>
        </div>

        <section className="mt-8 grid border border-black lg:grid-cols-[0.75fr_1.25fr]">
          <div className="bg-black p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.16em]">Availability</p><h2 className="mt-12 font-serif text-3xl font-normal">Open or close a slot</h2><p className="mt-3 max-w-sm leading-7 text-neutral-300">Choose a date and time. Use “All times” to open or close the whole day.</p></div>
          <form onSubmit={saveOverride} className="grid content-start gap-4 bg-white p-6 text-black sm:grid-cols-2 sm:p-8">
            <div className="space-y-2"><Label htmlFor="manage-date">Date</Label><Input id="manage-date" name="date" type="date" required min={new Date().toISOString().slice(0, 10)} className="h-11 rounded-none border-black" /></div>
            <div className="space-y-2"><Label htmlFor="manage-time">Time</Label><select id="manage-time" name="time" className="h-11 w-full rounded-none border border-black bg-white px-3 text-sm"><option value="*">All times</option><option value="10:00">10:00 AM</option><option value="13:00">1:00 PM</option><option value="16:00">4:00 PM</option><option value="18:00">6:00 PM</option></select></div>
            <Button disabled={saving} type="submit" name="available" value="true" className="h-11 rounded-none bg-black text-white hover:bg-neutral-800"><Check /> Open</Button>
            <Button disabled={saving} type="submit" name="available" value="false" variant="outline" className="h-11 rounded-none border-black bg-white text-black hover:bg-neutral-100"><X /> Close</Button>
            {message && <p className="text-sm font-semibold text-neutral-600 sm:col-span-2">{message}</p>}
          </form>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.16em]">Upcoming</p><h2 className="mt-2 font-serif text-3xl font-normal">Confirmed sessions</h2></div><span className="border border-black px-3 py-1 text-sm font-semibold">{bookings.length}</span></div>
          <div className="mt-5 overflow-hidden border border-black bg-white">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Guest</TableHead><TableHead>Dish</TableHead><TableHead>Contact</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {bookings.length ? bookings.map((booking) => <TableRow key={booking.id}><TableCell className="font-semibold">{booking.sessionDate}<br /><span className="font-normal text-neutral-600">{booking.sessionTime}</span></TableCell><TableCell>{booking.guestName}</TableCell><TableCell>{booking.dishName}</TableCell><TableCell><a className="underline underline-offset-2" href={`mailto:${booking.guestEmail}`}>{booking.guestEmail}</a>{booking.guestPhone && <><br /><span>{booking.guestPhone}</span></>}</TableCell><TableCell className="max-w-xs whitespace-normal text-neutral-600">{booking.notes || "—"}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="py-12 text-center text-neutral-600">No upcoming bookings yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </main>
  );
}
