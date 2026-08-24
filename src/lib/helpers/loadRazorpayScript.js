"use client";

/** Loads Razorpay's official Checkout overlay script once, on demand — not
 * on every page load, since most visitors never open a Razorpay checkout. */
export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load Razorpay Checkout. Check your connection and try again."));
    document.body.appendChild(script);
  });
}
