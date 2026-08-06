import Link from "next/link";

export default function PlatformFooter() {
  return (
    <footer className="relative border-t border-white/10 px-6 py-10 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-muted sm:flex-row">
        <p>© {new Date().getFullYear()} Global Vista. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="/" className="transition-colors hover:text-gold">Home</Link>
          <Link href="/privacy-policy" className="transition-colors hover:text-gold">Privacy Policy</Link>
          <Link href="/terms-of-service" className="transition-colors hover:text-gold">Terms of Service</Link>
          <Link href="/login" className="transition-colors hover:text-gold">Sign In</Link>
        </div>
      </div>
    </footer>
  );
}
