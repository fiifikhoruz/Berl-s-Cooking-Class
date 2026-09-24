import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    dishId: text("dish_id").notNull(),
    dishName: text("dish_name").notNull(),
    sessionDate: text("session_date").notNull(),
    sessionTime: text("session_time").notNull(),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone"),
    notes: text("notes"),
    status: text("status").notNull().default("confirmed"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("bookings_unique_slot").on(table.sessionDate, table.sessionTime),
    index("bookings_session_date").on(table.sessionDate),
    index("bookings_guest_email").on(table.guestEmail),
  ],
);

export const availabilityOverrides = sqliteTable(
  "availability_overrides",
  {
    key: text("key").primaryKey(),
    sessionDate: text("session_date").notNull(),
    sessionTime: text("session_time").notNull(),
    available: integer("available", { mode: "boolean" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("availability_overrides_date").on(table.sessionDate)],
);
