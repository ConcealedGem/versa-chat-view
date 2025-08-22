import { GeistSans } from 'geist/font';
import { GeistMono } from 'geist/font/mono';
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeScript } from "@/components/theme-script";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Consulting Advisor",
  description: "每个应用都应该有一个自己的Chat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
