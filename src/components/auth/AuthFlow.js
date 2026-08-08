"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

// Login is the "home" of the flow; Forgot/Reset sit one step further in —
// going deeper slides one way, coming back slides the other.
const ORDER = { login: 0, forgot: 1, reset: 1 };
const PATHS = { login: "/login", forgot: "/forgot-password", reset: "/reset-password" };

const variants = {
  enter: (dir) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
};

/**
 * Login/Forgot Password/Reset Password all live in ONE persistent client
 * component and switch via local state — not Next.js route navigation —
 * so the slide is never at the mercy of route/layout remount timing. The
 * URL still updates (via history.pushState, not router.push) purely so
 * direct links and the browser back button keep working; it never
 * triggers a real Next.js navigation or remounts this component.
 */
export default function AuthFlow({ initialView = "login" }) {
  const [view, setView] = useState(initialView);
  const [direction, setDirection] = useState(0);
  const orderRef = useRef(ORDER[initialView]);

  function navigate(next) {
    if (next === view) return;
    setDirection(ORDER[next] - orderRef.current);
    orderRef.current = ORDER[next];
    setView(next);
    try { window.history.pushState({ authView: next }, "", PATHS[next] + (next === "reset" ? window.location.search : "")); } catch { /* ignore */ }
  }

  useEffect(() => {
    function onPopState(e) {
      const next = e.state?.authView || "login";
      setDirection(ORDER[next] - orderRef.current);
      orderRef.current = ORDER[next];
      setView(next);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={view}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <AuthShell>
            {view === "login" && <LoginForm onNavigate={navigate} />}
            {view === "forgot" && <ForgotPasswordForm onNavigate={navigate} />}
            {view === "reset" && <ResetPasswordForm onNavigate={navigate} />}
          </AuthShell>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
