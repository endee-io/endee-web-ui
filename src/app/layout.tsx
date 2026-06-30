import type { Metadata } from "next";
import "../App.css";
import AppBootstrap from "@/components/AppBootstrap";
import TopBar from "@/components/TopBar";

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
        <AppBootstrap>
          <div className="flex flex-col h-screen bg-card-background dark:bg-slate-800">
            <TopBar />
            {children}
          </div>
        </AppBootstrap>
      </body>
    </html>
  );
}
