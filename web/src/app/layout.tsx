import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/app.css";

// Self-hosted by next/font: no request to Google from the visitor's browser.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "m’aso — Make room for every voice",
    template: "%s — m’aso",
  },
  description:
    "Built for a teammate who couldn’t hear us: live captions, typing for everyone and a note of what was agreed, all on your own laptop.",
};

export const viewport: Viewport = {
  themeColor: "#f4f4f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
