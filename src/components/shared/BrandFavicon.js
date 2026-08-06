"use client";
import { useEffect } from "react";

export default function BrandFavicon({ faviconUrl }) {
  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector("link[rel~='icon']");
    const previousHref = link?.getAttribute("href");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
    return () => { if (link && previousHref) link.href = previousHref; };
  }, [faviconUrl]);

  return null;
}
