import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import AuthNav from "@/components/AuthNav";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "canibuythis — Cash Flow Decision Engine",
  description: "Evaluate business purchases against your cash flow.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ErrorBoundary>
          <AuthProvider>
            <AuthNav />
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
