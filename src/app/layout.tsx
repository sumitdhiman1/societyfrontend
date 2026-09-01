import type { Metadata } from "next";
import { Inter, Manrope, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { ChatWidgetProvider } from "@/context/ChatWidgetContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import LiveChatWidget from "@/components/chat/LiveChatWidget";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Society - Create What You Want",
  description: "A platform for managing and creating projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Toaster position="top-right" richColors closeButton />
        <CurrencyProvider>
          <ChatWidgetProvider>
            {children}
            <LiveChatWidget />
          </ChatWidgetProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
