"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Button({
  children,
  variant = "primary",
  className,
  as = "button",
  href,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-medium tracking-wide transition-all duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

  const variants = {
    primary:
      "bg-gold text-navy hover:shadow-[0_0_30px_rgba(216,155,29,0.45)] hover:brightness-110",
    outline:
      "border border-white/20 text-offwhite bg-white/5 backdrop-blur-md hover:border-gold/50 hover:bg-white/10",
    ghost: "text-offwhite hover:text-gold",
  };

  const Component = motion[as] || motion.button;

  if (as === "a") {
    return (
      <motion.a
        href={href}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={cn(base, variants[variant], className)}
        {...props}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <Component
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
}