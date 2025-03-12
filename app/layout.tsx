import Header from "@/components/header";
import Footer from "@/components/footer";
import { Raleway, Merriweather } from "next/font/google";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ['300', '400', '700', '900'],
  variable: "--font-merriweather",
  display: "swap",
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
    <html lang="en" className={`${raleway.variable} ${merriweather.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased noise-texture">
        <div className="relative flex min-h-screen flex-col z-10">
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
