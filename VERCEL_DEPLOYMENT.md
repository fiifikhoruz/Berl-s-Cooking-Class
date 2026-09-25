# Vercel deployment

## 1. Create the database

Create a Supabase project and run `supabase/schema.sql` in its SQL editor.

## 2. Add Vercel environment variables

Copy the keys from `.env.example` into Vercel for Production, Preview, and Development. Use a strong admin password and a random session secret of at least 32 characters.

Required variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (recommended) or `SUPABASE_SERVICE_ROLE_KEY` (legacy)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `RESEND_API_KEY`
- `BOOKING_FROM_EMAIL`
- `BOOKING_NOTIFICATION_EMAILS`
- `SESSION_MEETING_URL`

Resend requires `BOOKING_FROM_EMAIL` to use a sender address on a verified domain. Separate multiple notification recipients with commas. The reusable Google Meet or Zoom URL is included on the confirmation page and in the visitor email.

## 3. Deploy

Import the repository into Vercel or run the Vercel CLI from the project root. Vercel reads `vercel.json` and runs the standard Next.js production build.

## 4. Verify

- Open the homepage and complete a test booking.
- Confirm that the visitor and each notification recipient receive their emails.
- Confirm that the selected time disappears from availability.
- Open `/manage`, sign in with the admin credentials, and confirm the booking appears.
- Open and close one future time slot, then verify the public calendar updates.
