/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Security headers per Phase 1 spec. Applied CRM-wide via matcher
        // so the public marketing site (if it has its own next.config
        // rules) isn't affected.
        source: "/crm/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;