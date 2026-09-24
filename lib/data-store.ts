import { and, desc, eq, gte, lte } from "drizzle-orm";

export type BookingRecord = {
  id: string;
  dishId: string;
  dishName: string;
  sessionDate: string;
  sessionTime: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
};

export type BookingInput = Omit<BookingRecord, "createdAt"> & { createdAt: Date };
export type AvailabilityOverrideRecord = {
  key: string;
  sessionDate: string;
  sessionTime: string;
  available: boolean;
  updatedAt: Date;
};

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Supabase request failed (${response.status}): ${detail}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
  return response.json() as Promise<T>;
}

export async function getAvailabilityInputs(startKey: string, endKey: string) {
  if (hasSupabaseConfig()) {
    const [overrides, reserved] = await Promise.all([
      supabaseRequest<Array<{ key: string; session_date: string; session_time: string; available: boolean; updated_at: string }>>(
        `availability_overrides?select=key,session_date,session_time,available,updated_at&session_date=gte.${startKey}&session_date=lte.${endKey}`,
      ),
      supabaseRequest<Array<{ session_date: string; session_time: string }>>(
        `bookings?select=session_date,session_time&session_date=gte.${startKey}&session_date=lte.${endKey}&status=eq.confirmed`,
      ),
    ]);
    return {
      overrides: overrides.map((row) => ({ key: row.key, sessionDate: row.session_date, sessionTime: row.session_time, available: row.available, updatedAt: new Date(row.updated_at) })),
      reserved: reserved.map((row) => ({ date: row.session_date, time: row.session_time })),
    };
  }

  const [{ getDb }, { availabilityOverrides, bookings }] = await Promise.all([import("@/db"), import("@/db/schema")]);
  const db = getDb();
  const [overrides, reserved] = await Promise.all([
    db.select().from(availabilityOverrides).where(and(gte(availabilityOverrides.sessionDate, startKey), lte(availabilityOverrides.sessionDate, endKey))),
    db.select({ date: bookings.sessionDate, time: bookings.sessionTime }).from(bookings).where(and(gte(bookings.sessionDate, startKey), lte(bookings.sessionDate, endKey), eq(bookings.status, "confirmed"))),
  ]);
  return { overrides, reserved };
}

export async function createBooking(data: BookingInput) {
  if (hasSupabaseConfig()) {
    await supabaseRequest("bookings", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: data.id,
        dish_id: data.dishId,
        dish_name: data.dishName,
        session_date: data.sessionDate,
        session_time: data.sessionTime,
        guest_name: data.guestName,
        guest_email: data.guestEmail,
        guest_phone: data.guestPhone,
        notes: data.notes,
        status: data.status,
        created_at: data.createdAt.toISOString(),
      }),
    });
    return;
  }
  const [{ getDb }, { bookings }] = await Promise.all([import("@/db"), import("@/db/schema")]);
  await getDb().insert(bookings).values(data);
}

export async function listUpcomingBookings(today: string): Promise<BookingRecord[]> {
  if (hasSupabaseConfig()) {
    const rows = await supabaseRequest<Array<Record<string, string | null>>>(
      `bookings?select=id,dish_id,dish_name,session_date,session_time,guest_name,guest_email,guest_phone,notes,status,created_at&session_date=gte.${today}&order=session_date.desc,session_time.asc`,
    );
    return rows.map((row) => ({
      id: row.id ?? "",
      dishId: row.dish_id ?? "",
      dishName: row.dish_name ?? "",
      sessionDate: row.session_date ?? "",
      sessionTime: row.session_time ?? "",
      guestName: row.guest_name ?? "",
      guestEmail: row.guest_email ?? "",
      guestPhone: row.guest_phone,
      notes: row.notes,
      status: row.status ?? "confirmed",
      createdAt: new Date(row.created_at ?? Date.now()),
    }));
  }
  const [{ getDb }, { bookings }] = await Promise.all([import("@/db"), import("@/db/schema")]);
  return getDb().select().from(bookings).where(gte(bookings.sessionDate, today)).orderBy(desc(bookings.sessionDate));
}

export async function upsertAvailabilityOverride(data: AvailabilityOverrideRecord) {
  if (hasSupabaseConfig()) {
    await supabaseRequest("availability_overrides?on_conflict=key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key: data.key, session_date: data.sessionDate, session_time: data.sessionTime, available: data.available, updated_at: data.updatedAt.toISOString() }),
    });
    return;
  }
  const [{ getDb }, { availabilityOverrides }] = await Promise.all([import("@/db"), import("@/db/schema")]);
  await getDb().insert(availabilityOverrides).values(data).onConflictDoUpdate({
    target: availabilityOverrides.key,
    set: { available: data.available, updatedAt: data.updatedAt },
  });
}
