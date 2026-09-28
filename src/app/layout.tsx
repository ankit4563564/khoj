import type { Metadata, Viewport } from "next";
import "@/styles/rvu.css";
import "@/styles/dashboard.css";
import "@/styles/identity.css";
import Shell from "@/components/rvu/Shell";
export const metadata: Metadata = {
  title: "KHOJ — RV University Lost & Found",
  description:
    "The RV University campus lost and found. Report items, discover possible matches, and collect safely through verified staff.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0e16",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="sr-only" href="#main-content">
          Skip to content
        </a>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
