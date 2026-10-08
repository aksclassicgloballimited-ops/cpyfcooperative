import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaSetup from "@/components/PwaSetup";
import NativeMemberNav from "@/components/NativeMemberNav";
import IdleLogout from "@/components/IdleLogout";

export const metadata: Metadata = {
  title: "CPYIF Cooperative Society",
  description: "Circle of Prosperous Youth Interest-Free Cooperative Society",
  applicationName: "CPYIF",
  appleWebApp: { capable: true, title: "CPYIF", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/cpyf-logo.jpeg",
    shortcut: "/cpyf-logo.jpeg",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6A11CB",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <PwaSetup />
        <NativeMemberNav />
        <IdleLogout />
      </body>
    </html>
  );
}
