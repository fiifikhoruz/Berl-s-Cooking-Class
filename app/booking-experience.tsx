"use client";

import { FormEvent, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Dish = { id: string; name: string; description: string };
type Availability = Record<string, string[]>;
type AvailabilityResponse = { availability: Availability };
type BookingResponse = { bookingId: string; status: string; error?: string; confirmationEmailSent?: boolean; adminNotificationSent?: boolean; meetingUrl?: string | null };
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

const dishes: Dish[] = [
  { id: "jollof", name: "Ghana Jollof", description: "A rich tomato base, layered flavour, and rice cooked just right." },
  { id: "waakye", name: "Waakye", description: "The rice-and-beans classic, with a simple way to bring the plate together." },
  { id: "red-red", name: "Red Red", description: "A full-bodied bean stew with sweet, golden plantain." },
  { id: "groundnut-soup", name: "Groundnut Soup", description: "Smooth, savoury groundnut soup with balanced heat and depth." },
];

function toDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(date);
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function fetchAvailability(signal?: AbortSignal) {
  const response = await fetch("/api/availability", { cache: "no-store", signal });
  const payload = await response.json() as AvailabilityResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Availability is temporarily unavailable.");
  return payload.availability;
}

function scrollToSection(event: ReactMouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  const target = document.getElementById(id);
  if (!target) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  window.history.replaceState(null, "", `#${id}`);
}

export function BookingExperience() {
  const [step, setStep] = useState(1);
  const [dishId, setDishId] = useState(dishes[0].id);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [availability, setAvailability] = useState<Availability>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);

  const loadAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    setAvailabilityError("");
    try {
      setAvailability(await fetchAvailability());
    } catch {
      setAvailability({});
      setAvailabilityError("Booking times are temporarily unavailable. Please try again.");
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAvailability(controller.signal)
      .then((nextAvailability) => setAvailability(nextAvailability))
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setAvailability({});
        setAvailabilityError("Booking times are temporarily unavailable. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const dishNames = Object.fromEntries(dishes.map((dish) => [dish.id, dish.name]));
    void Promise.resolve(context.registerTool({
      name: "create_cooking_session_booking",
      title: "Book a cooking session",
      description: "Confirm one free virtual Ghanaian cooking session for an available dish, date and time.",
      inputSchema: {
        type: "object",
        properties: {
          dishId: { type: "string", enum: dishes.map((dish) => dish.id) },
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          name: { type: "string", minLength: 2 },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          notes: { type: "string" },
        },
        required: ["dishId", "date", "time", "name", "email"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const data = input as Record<string, string>;
        if (!dishNames[data.dishId] || !data.date || !data.time || !data.name || !data.email) throw new Error("Missing or invalid booking details.");
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, dishName: dishNames[data.dishId], phone: data.phone ?? "", notes: data.notes ?? "" }),
        });
        const payload = await response.json() as BookingResponse;
        if (!response.ok) throw new Error(payload.error ?? "Booking failed.");
        const [year, month, day] = data.date.split("-").map(Number);
        setDishId(data.dishId);
        setDate(new Date(year, month - 1, day, 12));
        setTime(data.time);
        setBookingId(payload.bookingId);
        setConfirmationEmailSent(Boolean(payload.confirmationEmailSent));
        setMeetingUrl(payload.meetingUrl ?? null);
        setStep(4);
        return { bookingId: payload.bookingId, status: payload.status, confirmationEmailSent: payload.confirmationEmailSent, dish: dishNames[data.dishId], date: data.date, time: data.time };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    return () => lifecycle.abort();
  }, []);

  const selectedDish = dishes.find((dish) => dish.id === dishId) ?? dishes[0];
  const availableDates = useMemo(() => new Set(Object.keys(availability).filter((key) => availability[key]?.length)), [availability]);
  const dateKey = date ? toDateKey(date) : "";
  const times = dateKey ? availability[dateKey] ?? [] : [];

  function selectDate(nextDate: Date | undefined) {
    setDate(nextDate);
    setTime("");
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date || !time) return;
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishId, dishName: selectedDish.name, date: dateKey, time, name: form.get("name"), email: form.get("email"), phone: form.get("phone"), notes: form.get("notes") }),
      });
      const payload = await response.json() as BookingResponse;
      if (!response.ok) throw new Error(payload.error ?? "We could not confirm that session.");
      setBookingId(payload.bookingId);
      setConfirmationEmailSent(Boolean(payload.confirmationEmailSent));
      setMeetingUrl(payload.meetingUrl ?? null);
      setStep(4);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not confirm that session.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <section id="top" className="relative min-h-screen overflow-hidden border-b border-black bg-black text-white supports-[height:100svh]:min-h-[100svh]">
        <Image src="/ghana-cooking-hero.png" alt="Ghanaian jollof rice with grilled chicken and plantain" fill priority sizes="100vw" className="object-cover object-[68%_center] sm:object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.62)_44%,rgba(0,0,0,0.14)_78%,rgba(0,0,0,0.08)_100%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.72)_0%,transparent_52%,rgba(0,0,0,0.38)_100%)]" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col supports-[height:100svh]:min-h-[100svh]">
          <header className="flex items-center justify-between gap-4 border-b border-white/40 px-4 py-4 sm:px-8 sm:py-5 lg:px-12">
            <a className="max-w-[11rem] text-xs font-bold uppercase leading-tight tracking-[0.1em] sm:max-w-none sm:text-sm sm:tracking-[0.12em]" href="#top" onClick={(event) => scrollToSection(event, "top")}>Berl&apos;s Cooking Class</a>
            <a className="min-h-11 shrink-0 content-center border-b border-white text-sm font-semibold" href="#book" onClick={(event) => scrollToSection(event, "book")}>Book a session</a>
          </header>

          <div className="flex flex-1 items-end px-4 pb-8 pt-16 sm:px-8 sm:pb-14 sm:pt-24 lg:px-12 lg:pb-16">
            <div className="min-w-0 max-w-4xl">
              <h1 className="font-serif text-[clamp(3rem,14vw,5.5rem)] font-normal leading-[0.88] tracking-[-0.055em] [text-shadow:0_2px_24px_rgba(0,0,0,0.4)] sm:text-[clamp(4.5rem,9vw,8.5rem)] sm:leading-[0.84] sm:tracking-[-0.065em]">Cook Ghanaian food, live from your kitchen.</h1>
              <div className="mt-8 grid max-w-2xl gap-6 border-t border-white/60 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
                <p className="max-w-lg text-base leading-7 text-white/90">Choose a dish, pick an open time, and cook it step by step in a relaxed one-to-one session.</p>
                <a href="#book" onClick={(event) => scrollToSection(event, "book")} className="inline-flex min-h-12 w-full items-center justify-center gap-3 bg-white px-5 text-sm font-semibold text-black transition-colors duration-200 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto">Book free <ArrowRight className="size-4" /></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="book" className="mx-auto grid max-w-[1440px] border-b border-black lg:grid-cols-[0.34fr_0.66fr]">
        <div className="border-b border-black px-4 py-8 sm:px-8 sm:py-9 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
          <h2 className="max-w-sm font-serif text-4xl font-normal leading-[0.95] tracking-[-0.04em] sm:text-5xl">Choose what you want to cook.</h2>
          <div className="mt-8 grid grid-cols-1 gap-2 border-t border-black pt-4 text-xs uppercase tracking-[0.12em] sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-1">
            {["Dish", "Date & time", "Your details"].map((label, index) => <div key={label} className={`flex gap-3 ${step === index + 1 ? "font-bold" : "text-neutral-400"}`}><span>{String(index + 1).padStart(2, "0")}</span><span>{label}</span></div>)}
          </div>
          <p className="mt-10 hidden max-w-xs text-sm leading-6 text-neutral-600 lg:block">Sessions are free, live, and approximately 60 minutes. Join from anywhere with your ingredients ready.</p>
        </div>

        <div className="min-h-[620px] min-w-0 px-4 py-8 sm:px-8 sm:py-9 lg:px-12 lg:py-14">
          {step === 1 && <div>
            <div className="border-t border-black">{dishes.map((dish, index) => {
              const selected = dish.id === dishId;
              return <button key={dish.id} type="button" onClick={() => setDishId(dish.id)} className={`group grid min-h-28 w-full grid-cols-[1.75rem_minmax(0,1fr)_1.5rem] gap-2 border-b border-black px-1 py-5 text-left transition-colors hover:bg-neutral-100 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-3 ${selected ? "bg-black text-white hover:bg-black" : "bg-white"}`}>
                <span className="text-xs font-semibold">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0"><span className="block font-serif text-2xl leading-none sm:text-3xl">{dish.name}</span><span className={`mt-2 block max-w-xl text-sm leading-6 ${selected ? "text-neutral-300" : "text-neutral-600"}`}>{dish.description}</span></span>
                <span className={`grid size-6 place-items-center border ${selected ? "border-white" : "border-black"}`}>{selected && <Check className="size-4" />}</span>
              </button>;
            })}</div>
            <div className="mt-7 flex justify-end"><Button onClick={() => setStep(2)} size="lg" className="h-12 w-full rounded-none bg-black px-6 text-base text-white hover:bg-neutral-800 sm:w-auto">Choose a date <ArrowRight /></Button></div>
          </div>}

          {step === 2 && <div>
            <button onClick={() => setStep(1)} className="mb-6 flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"><ArrowLeft className="size-4" /> Change dish</button>
            <h3 className="font-serif text-4xl font-normal leading-[0.95] tracking-[-0.04em] sm:text-5xl">Choose an available day.</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">Regular sessions run Monday to Wednesday. Selected Saturdays may also open.</p>
            {availabilityError && <div role="alert" className="mt-6 flex flex-col items-start gap-3 border border-black p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><span>{availabilityError}</span><Button type="button" variant="outline" onClick={() => void loadAvailability()} className="h-11 shrink-0 rounded-none border-black bg-white">Try again</Button></div>}
            {availabilityLoading && <p role="status" className="mt-6 border border-black p-4 text-sm">Loading available times…</p>}
            <div className="mt-8 grid gap-8 xl:grid-cols-[auto_1fr]">
              <div className="max-w-full overflow-x-auto border border-black bg-white p-1 sm:p-2"><Calendar mode="single" selected={date} onSelect={selectDate} disabled={(day) => availabilityLoading || Boolean(availabilityError) || !availableDates.has(toDateKey(day))} className="mx-auto bg-white p-1 [--cell-size:1.95rem] sm:p-3 sm:[--cell-size:2rem]" /></div>
              <div>
                <p className="mb-4 border-b border-black pb-3 text-sm font-semibold">{date ? formatDate(date) : "Select a day first"}</p>
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">{times.map((slot) => <button key={slot} type="button" onClick={() => setTime(slot)} className={`min-h-12 border border-black px-4 py-3 text-sm font-semibold transition-colors ${time === slot ? "bg-black text-white" : "bg-white hover:bg-neutral-100"}`}>{formatTime(slot)}</button>)}</div>
                {date && !times.length && <p className="border border-black p-4 text-sm text-neutral-600">No open times remain on this day.</p>}
              </div>
            </div>
            <div className="mt-7 flex justify-end"><Button disabled={!date || !time} onClick={() => setStep(3)} size="lg" className="h-12 w-full rounded-none bg-black px-6 text-base text-white hover:bg-neutral-800 sm:w-auto">Add your details <ArrowRight /></Button></div>
          </div>}

          {step === 3 && date && <form onSubmit={submitBooking}>
            <button type="button" onClick={() => setStep(2)} className="mb-6 flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"><ArrowLeft className="size-4" /> Change date or time</button>
            <h3 className="font-serif text-4xl font-normal leading-[0.95] tracking-[-0.04em] sm:text-5xl">Your session details.</h3>
            <div className="mt-6 border-y border-black py-4 text-sm"><p className="font-bold">{selectedDish.name}</p><p className="mt-1 text-neutral-600">{formatDate(date)} at {formatTime(time)}</p></div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="name">Your name</Label><Input id="name" name="name" required autoComplete="name" className="h-12 rounded-none border-black bg-white" /></div>
              <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" required autoComplete="email" className="h-12 rounded-none border-black bg-white" /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="phone">Phone or WhatsApp <span className="font-normal text-neutral-500">(optional)</span></Label><Input id="phone" name="phone" type="tel" autoComplete="tel" className="h-12 rounded-none border-black bg-white" /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="notes">Anything your host should know? <span className="font-normal text-neutral-500">(optional)</span></Label><textarea id="notes" name="notes" rows={3} className="w-full resize-none border border-black bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-black sm:text-sm" placeholder="Dietary needs, experience level, or questions" /></div>
            </div>
            {error && <p role="alert" className="mt-4 border border-black p-3 text-sm font-medium">{error}</p>}
            <div className="mt-6 flex justify-end"><Button disabled={submitting} type="submit" size="lg" className="h-12 w-full rounded-none bg-black px-6 text-base text-white hover:bg-neutral-800 sm:w-auto">{submitting ? "Confirming…" : "Confirm my free session"}</Button></div>
          </form>}

          {step === 4 && date && <div className="flex min-h-[500px] flex-col items-start justify-center">
            <span className="grid size-14 place-items-center border border-black"><Check className="size-7" /></span>
            <h3 className="mt-8 max-w-xl font-serif text-5xl font-normal leading-[0.95] tracking-[-0.045em] sm:text-6xl">Session confirmed. See you in the kitchen.</h3>
            <p className="mt-5 max-w-lg text-base leading-7 text-neutral-600">Your {selectedDish.name} session is booked for {formatDate(date)} at {formatTime(time)}.</p>
            {confirmationEmailSent ? <p className="mt-3 max-w-lg text-sm leading-6 text-neutral-600">A confirmation email with your session details has been sent.</p> : <p role="status" className="mt-3 max-w-lg border border-black p-3 text-sm leading-6">Your booking is saved, but the confirmation email could not be sent. Keep the booking reference below or call +1 (416) 826-8466.</p>}
            {meetingUrl && <a href={meetingUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 items-center justify-center bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800">Join the virtual session <ArrowRight className="ml-2 size-4" /></a>}
            <p className="mt-6 border-y border-black py-3 text-xs">Booking reference: {bookingId}</p>
            <Button variant="outline" onClick={() => { setStep(1); setDate(undefined); setTime(""); setBookingId(""); setConfirmationEmailSent(false); setMeetingUrl(null); }} className="mt-8 h-12 rounded-none border-black bg-transparent">Book another session</Button>
          </div>}
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-8 text-xs uppercase tracking-[0.1em] sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:tracking-[0.12em] lg:px-12"><p>Berl&apos;s Cooking Class</p><a className="w-fit border-b border-black pb-1 font-semibold" href="tel:+14168268466" aria-label="Call Berl's Cooking Class at plus one, four one six, eight two six, eight four six six">+1 (416) 826-8466</a></footer>
    </main>
  );
}
