import Header from "@/components/header";
import Footer from "@/components/footer";
import { Geist } from "next/font/google";
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
          <Header />
          <main className="flex-1 pt-8">
            <div className="container flex-1">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
