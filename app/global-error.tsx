"use client";

// Replaces the whole app shell when the root layout itself fails, so it carries its own styles.
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#0e0e0e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <title>Honest Mailbox</title>
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, letterSpacing: "0.1em", textTransform: "uppercase" }}>Something went wrong</h1>
          <p style={{ color: "#a3a3a3", fontSize: 14, lineHeight: 1.6 }}>
            The app hit a problem while loading. Nothing you wrote has been lost.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{ marginTop: 16, width: "100%", padding: "16px 0", borderRadius: 16, border: "none", background: "#fff", color: "#000", fontSize: 16, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
