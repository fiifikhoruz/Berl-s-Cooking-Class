import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berl's Cooking Class",
  description:
    "Book a free one-on-one virtual cooking class and learn to make a Ghanaian dish with Berl.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
