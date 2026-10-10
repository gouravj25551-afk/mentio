"use client";

// Last-resort boundary when the root layout itself fails, so it carries its own <html> and plain styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0, textAlign: "center" }}>
        <main style={{ padding: 24 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Something went wrong.</h1>
          <p style={{ color: "#555" }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ padding: "10px 18px", fontSize: 16, cursor: "pointer" }}>Try again</button>
          {error.digest ? <p style={{ color: "#777", fontSize: 12 }}>Reference: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
