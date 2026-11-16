"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "Georgia, serif", background: "#FFF8F2", color: "#2B2220", textAlign: "center", padding: "120px 20px" }}>
        <h1 style={{ fontWeight: 500 }}>REWAAS is taking a short pause.</h1>
        <p>Please refresh in a moment.</p>
        <button onClick={reset} style={{ marginTop: 24, padding: "12px 28px", background: "#C4553D", color: "#fff", border: 0, letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12 }}>Try again</button>
      </body>
    </html>
  );
}
