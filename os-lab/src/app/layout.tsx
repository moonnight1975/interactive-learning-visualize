import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OS Lab — Disk Scheduling & String Matching Simulator",
  description: "An interactive Operating System learning platform that visually simulates Disk Scheduling (FCFS) and String Matching algorithms (Naive/KMP) with real-time animations and performance analytics.",
  keywords: "disk scheduling, FCFS, string matching, KMP, operating system, simulation, OS lab",
  authors: [{ name: "OS Lab" }],
  openGraph: {
    title: "OS Lab — Disk Scheduling & String Matching Simulator",
    description: "Interactive OS simulation platform for disk scheduling and string pattern matching",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Inter:wght@300;400;500;600;700;800;900&family=Orbitron:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
