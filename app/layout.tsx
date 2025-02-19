import HeaderAuth from "@/components/header-auth";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export const metadata = {
  title: "Turbo Grant",
  description: "Grant management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
              <div className="flex flex-1 items-center justify-between">
                <Link 
                  href="/" 
                  className="font-semibold"
                >
                  Turbo Grant
                </Link>
                <HeaderAuth />
              </div>
            </div>
          </header>
          <main className="flex-1">
            <div className="container flex-1">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
