import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Taj Mahal — Sharm El Sheikh",
  description: "Experience world-class nightlife at Taj Mahal, Sharm El Sheikh's premier entertainment destination. Get your tickets now.",
  keywords: ["Taj Mahal", "Sharm El Sheikh", "nightclub", "tickets", "events", "nightlife"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-night-950 text-white`}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1F1F1F',
              color: '#EDEDED',
              border: '1px solid #2A2A2A',
            },
          }}
        />
      </body>
    </html>
  );
}
