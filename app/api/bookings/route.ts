import { NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/data-store";
import { getAvailability } from "@/lib/schedule";

const bookingSchema = z.object({
  dishId: z.enum(["jollof", "waakye", "red-red", "groundnut-soup"]),
  dishName: z.string().min(2).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(600).optional().default(""),
});

export async function POST(request: Request) {
  try {
    const parsed = bookingSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
    const data = parsed.data;
    const availability = await getAvailability();
    if (!availability[data.date]?.includes(data.time)) {
      return NextResponse.json({ error: "That time is no longer available. Please choose another." }, { status: 409 });
    }

    const id = crypto.randomUUID();
    await createBooking({
      id,
      dishId: data.dishId,
      dishName: data.dishName,
      sessionDate: data.date,
      sessionTime: data.time,
      guestName: data.name,
      guestEmail: data.email.toLowerCase(),
      guestPhone: data.phone || null,
      notes: data.notes || null,
      status: "confirmed",
      createdAt: new Date(),
    });

    return NextResponse.json({ bookingId: id.split("-")[0].toUpperCase(), status: "confirmed" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE") || message.includes("409") || message.includes("23505")) return NextResponse.json({ error: "That time has just been booked. Please choose another." }, { status: 409 });
    console.error("Booking creation failed", error);
    return NextResponse.json({ error: "We could not confirm your session. Please try again." }, { status: 500 });
  }
}
