import { Inter, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";

import "./globals.css";

import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
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
    <html
      lang="en"
      className={`${inter.variable} ${instrument.variable}`}
    >
    <head>
  {/* Google Analytics */}
  <Script
    src="https://www.googletagmanager.com/gtag/js?id=G-T71M3NLZCH"
    strategy="afterInteractive"
  />

  <Script id="google-analytics" strategy="afterInteractive">
    {`
      window.dataLayer = window.dataLayer || [];

      function gtag() {
        dataLayer.push(arguments);
      }

      gtag('js', new Date());
      gtag('config', 'G-T71M3NLZCH');
    `}
  </Script>

  {/* Meta Pixel */}
  <Script id="meta-pixel" strategy="afterInteractive">
    {`
      !function(f,b,e,v,n,t,s)
      {
        if(f.fbq)return;
        n=f.fbq=function(){
          n.callMethod ?
          n.callMethod.apply(n,arguments) : n.queue.push(arguments)
        };
        if(!f._fbq)f._fbq=n;
        n.push=n;
        n.loaded=!0;
        n.version='2.0';
        n.queue=[];
        t=b.createElement(e);
        t.async=!0;
        t.src=v;
        s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s);
      }(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');

      fbq('init', '3941002349542415');
      fbq('track', 'PageView');
    `}
  </Script>
</head>

     <body className="relative min-h-screen font-body antialiased">
  <noscript>
    <img
      height="1"
      width="1"
      style={{ display: "none" }}
      src="https://www.facebook.com/tr?id=3941002349542415&ev=PageView&noscript=1"
      alt=""
    />
  </noscript>

  <ThemeProvider>
    <LayoutWrapper>
      {children}
    </LayoutWrapper>
  </ThemeProvider>

  <Toaster
    position="top-right"
    richColors
    closeButton
    expand
    visibleToasts={3}
    duration={4000}
    toastOptions={{
      style: {
        background: "#0A1330",
        color: "#FFFFFF",
        border: "1px solid rgba(216,155,29,0.35)",
        borderRadius: "14px",
      },
    }}
  />
</body>
    </html>
  );
}