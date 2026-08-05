const miravaSupabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : ""
  } catch {
    return ""
  }
})()

const miravaPostHogOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_POSTHOG_HOST
      ? new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST).origin
      : ""
  } catch {
    return ""
  }
})()

const miravaPostHogAssetsOrigin = (() => {
  if (!miravaPostHogOrigin) return ""

  try {
    const url = new URL(miravaPostHogOrigin)
    const assetsHostname =
      url.hostname.replace(
        /^([a-z0-9-]+)\.i\.posthog\.com$/i,
        "$1-assets.i.posthog.com",
      )

    return assetsHostname === url.hostname
      ? ""
      : `${url.protocol}//${assetsHostname}`
  } catch {
    return ""
  }
})()

const miravaConnectSources = [
  "'self'",
  process.env.NODE_ENV === "development"
    ? "ws://localhost:*"
    : "",
  miravaSupabaseOrigin,
  miravaPostHogAssetsOrigin,
  miravaPostHogOrigin,
].filter(Boolean).join(" ")

const miravaImageSources = [
  "'self'",
  "data:",
  "blob:",
  miravaSupabaseOrigin,
].filter(Boolean).join(" ")
const miravaScriptSources = [
  "'self'",
  "'unsafe-inline'",
  process.env.NODE_ENV === "development"
    ? "'unsafe-eval'"
    : "'wasm-unsafe-eval'",
  miravaPostHogAssetsOrigin,
].filter(Boolean).join(" ")
const miravaContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `script-src ${miravaScriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src ${miravaImageSources}`,
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
