import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "KHOJ — A way back",
  description:
    "Your belongings. Your campus. A way back. A practice version of campus lost and found.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
