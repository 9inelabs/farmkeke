"use client";

// W-S2 when the root layout itself fails. It replaces the whole document, so
// it brings its own <html>, <body>, fonts and styles.
import { Inter, Montserrat } from "next/font/google";
import { useEffect } from "react";
import { ErrorView } from "@/components/system/ErrorView";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-montserrat", display: "swap" });

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en-NG" className={`${inter.variable} ${montserrat.variable}`}>
      <body>
        <title>Something went wrong · Farmkeke</title>
        <ErrorView error={error} retry={retry} />
      </body>
    </html>
  );
}
