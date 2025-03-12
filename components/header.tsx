import Link from "next/link";
import HeaderAuth from "./header-auth";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-between">
          <Link 
            href="/" 
            className="font-bold font-heading tracking-tight"
          >
            Turbo Grant
          </Link>
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
} 