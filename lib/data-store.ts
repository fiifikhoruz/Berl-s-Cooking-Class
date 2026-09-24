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

type SupabaseConfig = { url: string; key: string; legacyJwt: boolean };

function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

  if (!url || !key) {
    throw new Error("Supabase server environment variables are missing.");
  }

  if (key.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_SECRET_KEY contains a publishable key. Configure a server secret key instead.");
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("SUPABASE_URL is not a valid HTTPS project URL.");
  }

  const legacyJwt = key.startsWith("eyJ");
  if (legacyJwt) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")) as { role?: string };
      if (payload.role !== "service_role") {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY does not contain a service_role key.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("service_role")) throw error;
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not a valid service_role key.");
    }
  }

  return { url, key, legacyJwt };
}

async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      ...(config.legacyJwt ? { Authorization: `Bearer ${config.key}` } : {}),
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

export async function createBooking(data: BookingInput) {
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
}

export async function listUpcomingBookings(today: string): Promise<BookingRecord[]> {
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

export async function upsertAvailabilityOverride(data: AvailabilityOverrideRecord) {
  await supabaseRequest("availability_overrides?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: data.key, session_date: data.sessionDate, session_time: data.sessionTime, available: data.available, updated_at: data.updatedAt.toISOString() }),
  });
}
