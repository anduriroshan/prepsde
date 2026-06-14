import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "PrepSDE",
  description: "Your SDE interview preparation companion",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d0d0d] text-[#f0f0f0] min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-60 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
