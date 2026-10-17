import { ImageResponse } from "next/og";

export const alt = "Honest Mailbox — games, check-ins and a safe space for couples";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Code-generated rather than a static asset: no brand font file is checked into the
// repo yet, so this uses a system sans-serif. Swap for a static opengraph-image.png
// (Bebas Neue, brand gradient) once that asset exists.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0e0e",
          backgroundImage:
            "radial-gradient(circle at 25% 30%, rgba(224,108,159,0.35), transparent 55%), radial-gradient(circle at 75% 70%, rgba(122,162,247,0.35), transparent 55%)",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "#ffffff",
            textTransform: "uppercase",
          }}
        >
          Honest Mailbox
        </div>
        <div style={{ fontSize: 30, color: "#a3a3a3", marginTop: 20 }}>
          Games, check-ins & a safe space for couples
        </div>
      </div>
    ),
    { ...size }
  );
}
