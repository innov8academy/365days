import type { Metadata, Viewport } from "next";
import { DM_Sans, Bricolage_Grotesque } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "365 Days",
  description: "Couples accountability app — crush your goals together",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${bricolage.variable} font-body antialiased min-h-screen`}
        suppressHydrationWarning
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
