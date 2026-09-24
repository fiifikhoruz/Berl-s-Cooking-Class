import { getAvailabilityInputs } from "@/lib/data-store";

export type Availability = Record<string, string[]>;
const DEFAULT_TIMES = ["10:00", "13:00", "16:00"];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getAvailability(): Promise<Availability> {
  const start = new Date();
  start.setUTCHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 35);
  const startKey = isoDate(start);
  const endKey = isoDate(end);
  const availability: Availability = {};

  for (let i = 1; i <= 35; i += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    if ([1, 2, 3].includes(date.getUTCDay())) availability[isoDate(date)] = [...DEFAULT_TIMES];
  }

  const { overrides, reserved } = await getAvailabilityInputs(startKey, endKey);

  for (const override of overrides) {
    if (override.sessionTime === "*") {
      availability[override.sessionDate] = override.available ? [...DEFAULT_TIMES] : [];
      continue;
    }
    const times = new Set(availability[override.sessionDate] ?? []);
    if (override.available) times.add(override.sessionTime);
    else times.delete(override.sessionTime);
    availability[override.sessionDate] = [...times].sort();
  }

  for (const booking of reserved) {
    availability[booking.date] = (availability[booking.date] ?? []).filter((time) => time !== booking.time);
  }
  return availability;
}
