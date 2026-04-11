import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NGILP — I/O Simulation & Optimization Lab",
  description: "Next Generation Interactive Learning Platform. Physics-accurate disk simulation with rotational latency, HDD/SSD/NVMe comparison, page fault visualization, and string matching algorithm analysis (Naive, KMP, Rabin-Karp, Boyer-Moore).",
  keywords: "disk scheduling, FCFS, SSTF, SCAN, rotational latency, SSD, NVMe, page fault, string matching, KMP, operating system, simulation, NGILP",
  authors: [{ name: "NGILP" }],
  openGraph: {
    title: "NGILP — I/O Simulation & Optimization Lab",
    description: "Physics-accurate interactive OS simulation platform with disk scheduling, storage comparison, and string pattern matching",
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
