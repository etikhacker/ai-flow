import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Flow",
  description: "Visual YES/NO AI workflows powered by Inngest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
