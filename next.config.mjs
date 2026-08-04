const miravaConnectSources = process.env.NODE_ENV === "development" ? "'self' ws://localhost:*" : "'self'"
const miravaScriptSources = process.env.NODE_ENV === "development"
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline' 'wasm-unsafe-eval'"
const miravaContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `script-src ${miravaScriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  `connect-src ${miravaConnectSources}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self'",
].join("; ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typescript: {
    tsconfigPath: process.env.NEXT_TSCONFIG_PATH || "tsconfig.json",
  },
  experimental: {
    optimizeCss: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/webp", "image/avif"],
  },
  async headers() {
    return [{
      source: "/visual-engine/:path*",
      headers: [
        { key: "Content-Security-Policy", value: miravaContentSecurityPolicy },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }]
  },
}

export default nextConfig
