import Link from "next/link";
import Image from "next/image";
import {
  Globe2,
  Mail,
  Phone,
  MessageCircle,
} from "lucide-react";

import { FaLinkedinIn } from "react-icons/fa";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us " },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact Us" },
];

const services = [
  "Career Counselling & Study Guidance",
  "International Summer School Visits (UK)",
  "CERN Educational Visits",
  // "Flexible Learning",
];

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
          <div className="grid gap-12 lg:grid-cols-4">
            <div className="lg:col-span-2">
             <Link href="/" className="flex items-center gap-4 group">
  {/* Logo Container */}
  <div
    className="
      relative
      h-16 w-16
      lg:h-20 lg:w-20
      overflow-hidden
      rounded-full
      border border-[#D89B1D]/40
      bg-gradient-to-br
      from-[#0A1330]
      to-[#111C48]
      shadow-[0_0_20px_rgba(216,155,29,0.25)]
      transition-all
      duration-300
      group-hover:scale-105
      group-hover:shadow-[0_0_35px_rgba(216,155,29,0.45)]
    "
  >
    <Image
      src="/images/logo.png"
      alt="Global Vista Educators Logo"
      fill
      priority
      className="object-contain p-0"
    />
  </div>

  {/* Text */}
  <div className="flex flex-col leading-none">
    <span className="font-display text-2xl font-semibold text-white tracking-wide">
      Global Vista
    </span>

    <span className="mt-1 text-sm lg:text-base font-medium tracking-[0.35em] uppercase text-[#D89B1D]">
      EDUCATORS
    </span>

    <span className="mt-2 hidden xl:block text-[10px] tracking-[0.4em] uppercase text-white/70">
      EXPLORE • EDUCATE • EMPOWER
    </span>
  </div>
</Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                Connecting  students with UK educators for career counselling, mentorship,
                and global academic opportunities.
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.25em] text-gold">
                Explore • Educate • Empower
              </p>
             <div className="mt-6 flex items-center gap-3">
  <a
    href="https://wa.me/9198145 61099"
    target="_blank"
    rel="noopener noreferrer"
    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-all hover:border-green-500/50 hover:text-green-400"
  >
    <MessageCircle className="h-4 w-4" />
  </a>

  <a
    href="mailto:GlobalVistaEducators@gmail.com"
    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-all hover:border-gold/40 hover:text-gold"
  >
    <Mail className="h-4 w-4" />
  </a>

  <a
    href="https://linkedin.com/company/global-vista-educators"
    target="_blank"
    rel="noopener noreferrer"
    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-all hover:border-blue-500/50 hover:text-blue-400"
  >
    <FaLinkedinIn className="h-4 w-4" />
  </a>

  <a
    href="tel:+9198145 61099"
    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-all hover:border-gold/40 hover:text-gold"
  >
    <Phone className="h-4 w-4" />
  </a>
</div>
            </div>

            <div>
              <h4 className="font-display text-base text-offwhite">Quick Links</h4>
              <ul className="mt-4 space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display text-base text-offwhite">Services</h4>
              <ul className="mt-4 space-y-3">
                {services.map((service) => (
                  <li key={service} className="text-sm text-muted">
                    {service}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted">
                <Phone className="h-4 w-4 text-gold" />
                +91 98145 61099
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} Global Vista Educators. All rights reserved.</p>
           <div className="flex flex-wrap items-center gap-6">
  <Link
    href="/privacy-policy"
    className="transition-colors hover:text-gold"
  >
    Privacy Policy
  </Link>

  <Link
    href="/terms-of-service"
    className="transition-colors hover:text-gold"
  >
    Terms of Service
  </Link>

  <Link
    href="/platform-home"
    className="group flex items-center gap-2 rounded-full border border-[#D89B1D]/20 px-4 py-2 transition-all duration-300 hover:border-[#D89B1D] hover:bg-[#D89B1D]/10 hover:text-[#D89B1D]"
  >
    <Globe2 className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
    <span>KaizenBMS Platform</span>
  </Link>
</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
