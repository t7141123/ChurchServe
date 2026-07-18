import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="zh-TW" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
        {children}
      </body>
    </html>
  );
}
