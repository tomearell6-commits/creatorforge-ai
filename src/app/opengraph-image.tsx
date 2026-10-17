import { ImageResponse } from "next/og";

// Default social-share image (Open Graph / link previews) for the whole site.
export const alt = "CreatorsForge.io — The AI Business Operating System";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0a0b 0%, #1a2e05 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#65a30d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            C
          </div>
          <div style={{ display: "flex", marginLeft: 24, fontSize: 52, fontWeight: 800 }}>
            <span>CreatorsForge</span>
            <span style={{ color: "#a3e635" }}>.io</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>
          The AI Business Operating System
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#d4d4d8" }}>
          Create, publish, automate and grow — SEO, social, websites, video and more.
        </div>
      </div>
    ),
    { ...size }
  );
}
