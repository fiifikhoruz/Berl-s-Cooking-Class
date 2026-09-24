# Vercel deployment

## 1. Create the database

Create a Supabase project and run `supabase/schema.sql` in its SQL editor.

## 2. Add Vercel environment variables

Copy the keys from `.env.example` into Vercel for Production, Preview, and Development. Use a strong admin password and a random session secret of at least 32 characters.

Required variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

## 3. Deploy

Import the repository into Vercel or run the Vercel CLI from the project root. Vercel reads `vercel.json` and runs the standard Next.js production build.

## 4. Verify

- Open the homepage and complete a test booking.
- Confirm that the selected time disappears from availability.
- Open `/manage`, sign in with the admin credentials, and confirm the booking appears.
- Open and close one future time slot, then verify the public calendar updates.
