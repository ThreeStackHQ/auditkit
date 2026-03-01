import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AuditKit — Audit Logging for Indie SaaS",
  description: "Track every user action. Embed an activity feed in minutes.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
