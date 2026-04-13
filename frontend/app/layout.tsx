import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/contexts/AuthContext"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "Ebliss Cloud - Customer Portal",
    template: "%s | Ebliss Cloud",
  },
  description: "Ebliss Cloud Customer Portal - Manage your virtual machines, billing, and cloud infrastructure from one centralized dashboard. Deploy, scale, and monitor your resources with ease.",
  keywords: [
    "cloud portal",
    "vps management",
    "virtual machines",
    "cloud infrastructure",
    "ebliss cloud",
    "vm management",
    "cloud hosting",
    "infrastructure management"
  ],
  authors: [{ name: "Ebliss Cloud", url: "https://ebliss.com" }],
  creator: "Ebliss Cloud",
  publisher: "Ebliss Cloud",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://ebliss.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Ebliss Cloud - Customer Portal",
    description: "Manage your cloud infrastructure with Ebliss Cloud Customer Portal",
    url: "https://ebliss.com",
    siteName: "Ebliss Cloud",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ebliss Cloud Customer Portal",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ebliss Cloud - Customer Portal",
    description: "Manage your cloud infrastructure with Ebliss Cloud Customer Portal",
    images: ["/og-image.png"],
    creator: "@eblisscloud",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 font-sans antialiased">
      
        <div className="flex-1 flex flex-col min-h-screen">
        <AuthProvider>
          <main className="flex-1 p-6 md:p-8">{children}</main>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}