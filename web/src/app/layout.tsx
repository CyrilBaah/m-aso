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
    default: "m’aso — Make workplace conversations easier to follow",
    template: "%s — m’aso",
  },
  description:
    "Live captions, typed replies and a private record of what was agreed, for Deaf and hard-of-hearing colleagues.",
};

export const viewport: Viewport = {
  themeColor: "#f4f4f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
