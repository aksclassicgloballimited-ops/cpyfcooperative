import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPYIF Cooperative Society",
  description: "Circle of Prosperous Youth Interest-Free Cooperative Society",
  icons: {
    icon: "/cpyf-logo.jpeg",
    shortcut: "/cpyf-logo.jpeg",
    apple: "/cpyf-logo.jpeg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
