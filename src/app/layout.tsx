import type { Metadata } from "next";
import { Noto_Serif_TC, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
  display: "swap",
});

const notoSans = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChurchServe - 教會小組服事報名系統",
  description: "開源、免費、簡單好用的教會小組服事排班系統",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={`${notoSerif.variable} ${notoSans.variable} h-full antialiased`} style={{ colorScheme: "light dark" }}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
