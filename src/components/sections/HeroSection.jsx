"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import { fadeUp } from "@/animations/fadeUp";
import PremiumGlobe from "@/components/common/PremiumGlobe";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:px-10">
        <div>
          <motion.div {...fadeUp(0)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-gold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Explore • Educate • Empower
            </span>
          </motion.div>

        <motion.h1
  {...fadeUp(0.12)}
  className="mt-7 font-display text-4xl leading-[1.05] text-offwhite sm:text-5xl lg:text-6xl"
>
  Global <span className="text-gold">Expertise.</span>
  <br />
  Personalised <span className="text-gold">Guidance.</span>
</motion.h1>

         <motion.p
  {...fadeUp(0.24)}
  className="mt-8 max-w-xl text-lg leading-relaxed text-slate-300"
>
  Empowering students. Shaping futures.
  <br />
  Connecting ambitious learners with experienced UK educators,
  academic mentors and global opportunities.
</motion.p>

          <motion.div {...fadeUp(0.36)} className="mt-10 flex flex-wrap gap-4">
            <Button as="a" href="/contact" variant="primary">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button as="a" href="/services" variant="outline">
              Explore Services
            </Button>
          </motion.div>
        </div>

        <motion.div {...fadeUp(0.2, 0.8)}>
        


<PremiumGlobe
  size={520}
  imageSrc="/images/global-vista-map.png"  
/>
        </motion.div>
      </div>
    </section>
  );
}