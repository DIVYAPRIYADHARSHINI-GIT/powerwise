import type { Metadata, Viewport } from "next";
import {
  Inter,
  Noto_Nastaliq_Urdu,
  Noto_Sans_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_JP,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Oriya,
  Noto_Sans_SC,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n";
import { themeInitScript } from "@/components/ThemeProvider";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { SampleBanner } from "@/components/SampleBanner";
import { Toaster } from "@/components/ui";

// Fonts are self-hosted by Next.js at build time. Script fonts are not
// preloaded, so the browser only downloads a script's font when that script
// is on screen (unicode-range). next/font needs literal options per call.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const ta = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "600", "700"], variable: "--font-ta", display: "swap", preload: false });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--font-deva", display: "swap", preload: false });
const te = Noto_Sans_Telugu({ subsets: ["telugu"], weight: ["400", "600", "700"], variable: "--font-te", display: "swap", preload: false });
const kn = Noto_Sans_Kannada({ subsets: ["kannada"], weight: ["400", "600", "700"], variable: "--font-kn", display: "swap", preload: false });
const ml = Noto_Sans_Malayalam({ subsets: ["malayalam"], weight: ["400", "600", "700"], variable: "--font-ml", display: "swap", preload: false });
const bn = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "600", "700"], variable: "--font-bn", display: "swap", preload: false });
const gu = Noto_Sans_Gujarati({ subsets: ["gujarati"], weight: ["400", "600", "700"], variable: "--font-gu", display: "swap", preload: false });
const pa = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], weight: ["400", "600", "700"], variable: "--font-pa", display: "swap", preload: false });
const or = Noto_Sans_Oriya({ subsets: ["oriya"], weight: ["400", "600", "700"], variable: "--font-or", display: "swap", preload: false });
const ar = Noto_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "600", "700"], variable: "--font-ar", display: "swap", preload: false });
const ur = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-ur", display: "swap", preload: false });
const sc = Noto_Sans_SC({ weight: ["400", "700"], variable: "--font-sc", display: "swap", preload: false });
const jp = Noto_Sans_JP({ weight: ["400", "700"], variable: "--font-jp", display: "swap", preload: false });

const fontVars = [inter, ta, deva, te, kn, ml, bn, gu, pa, or, ar, ur, sc, jp].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  title: { default: "PowerWise - Know your bill before it arrives.", template: "%s | PowerWise" },
  description:
    "PowerWise is a demo smart electricity bill predictor for Indian homes: ML bill prediction, appliance breakdown, savings tips in rupees, what-if simulator, 12-month forecast, solar check and PDF reports. Sample data and sample tariff only.",
  applicationName: "PowerWise",
  keywords: ["electricity bill", "bill predictor", "energy saving", "machine learning", "India", "Next.js demo"],
  openGraph: { title: "PowerWise", description: "Know your bill before it arrives. A demo smart electricity bill predictor.", type: "website", images: ["/images/hero.svg"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbbf24" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={fontVars}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider>
          <NavBar />
          <SampleBanner />
          <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-4 sm:py-8">{children}</main>
          <Footer />
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
