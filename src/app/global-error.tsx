"use client";

/** Last-resort error page if the root layout itself fails. Uses plain styles because globals may not load. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F7F8FB", color: "#18203A", margin: 0 }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: "#5A6378", marginBottom: 24 }}>Pathway couldn&apos;t load. Please try again.</p>
            <button
              onClick={reset}
              style={{ background: "#2F4FD8", color: "#fff", border: 0, borderRadius: 8, padding: "10px 20px", fontSize: 16, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
