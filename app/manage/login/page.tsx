import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-white px-4 py-10 text-black">
      <div className="w-full max-w-md border border-black p-6 sm:p-8">
        <h1 className="font-serif text-4xl font-normal leading-none tracking-[-0.04em]">Manage Berl&apos;s Cooking Class</h1>
        <form action="/api/admin/login" method="post" className="mt-8 space-y-5">
          <div className="space-y-2"><label htmlFor="admin-email" className="text-sm font-semibold">Email address</label><input id="admin-email" name="email" type="email" autoComplete="username" required className="h-12 w-full border border-black px-3 outline-none focus:ring-2 focus:ring-black" /></div>
          <div className="space-y-2"><label htmlFor="admin-password" className="text-sm font-semibold">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required className="h-12 w-full border border-black px-3 outline-none focus:ring-2 focus:ring-black" /></div>
          {error && <p role="alert" className="border border-black p-3 text-sm">{error === "config" ? "Admin access has not been configured yet." : "The email or password is incorrect."}</p>}
          <button type="submit" className="min-h-12 w-full bg-black px-5 font-semibold text-white">Sign in</button>
        </form>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">Back to the website</Link>
      </div>
    </main>
  );
}
