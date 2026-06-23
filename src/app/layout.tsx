import type { Metadata } from "next";
import Script from "next/script";
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
      <head>
        {/* Runtime configuration (Endee server URL). Loaded before the app
            so window.__ENV__ is available during the first render. In Docker
            this file is rewritten at container start from the ENDEE_URL env. */}
        <Script src="/config.js" strategy="beforeInteractive" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
