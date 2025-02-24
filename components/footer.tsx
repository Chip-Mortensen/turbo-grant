import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-6 mt-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Turbo Grant. All rights reserved.
        </p>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:underline hover:text-foreground transition-colors">
            Terms of Use
          </Link>
          <Link href="/privacy" className="hover:underline hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
} 