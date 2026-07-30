import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#090a0a" }}>
      <svg width="104" height="104" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 8H28L21.5 28L28.5 48H10L16.5 28L10 8Z" fill="#f1f1ed" />
        <path d="M46 8H31L24.5 28L33 48H46L39.5 28L46 8Z" fill="#d5c6b0" />
      </svg>
    </div>,
    { ...size }
  )
}
