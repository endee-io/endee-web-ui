import type { Metadata } from "next";
import "../App.css";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  title: "Endee - Vector Database",
  icons: {
    icon: "/endee-logo.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
