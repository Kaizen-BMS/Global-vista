import { Inter, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import GalaxyBackground from "@/components/common/GalaxyBackground";
import ScrollProgress from "@/components/common/ScrollProgress";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Global Vista Educators | Explore • Educate • Empower",
  description:
    "Connecting Indian students with UK educators for mentorship, exam preparation, STEM support and global academic opportunity.",
  keywords: [
    "Global Vista Educators",
    "UK educators",
    "online tuition India",
    "STEM mentorship",
    "exam preparation",
  ],
  openGraph: {
    title: "Global Vista Educators",
    description:
      "Connecting Indian students with UK educators for mentorship and global academic opportunity.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-T71M3NLZCH"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];

            function gtag(){
              dataLayer.push(arguments);
            }

            gtag('js', new Date());

            gtag('config', 'G-T71M3NLZCH');
          `}
        </Script>
      </head>

      <body className="relative min-h-screen font-body antialiased">
        <GalaxyBackground />
        <ScrollProgress />
        <Navbar />
        <main className="relative z-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}